import prismaClient from "db/client";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { getGitHubIdentity, getGitHubProfile, resolveUsername, type GitHubUser } from "../services/github.services";
import { issueToken } from "../services/token.service";
import { generateUsername, safeUser } from "../services/user.service";
import { profileSyncQueue, type SyncPlatform } from '@devmatch/bullmq';



interface AuthResponse {
	token: string;
	user: {
		id: string;
		email: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
	};
}



export const loginUser = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res
				.status(400)
				.json({ message: "Email and password are required" });
		}

		const user = await prismaClient.user.findUnique({
			where: { email },
		});
		if (!user) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		if (!user.password) {
			return res.status(401).json({ message: "Please sign in with GitHub" });
		}

		const passwordMatch = await bcrypt.compare(password, user.password);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Invalid credentials" });
		}

		const token = issueToken(user);

		const response: AuthResponse = {
			token,
			user: safeUser(user),
		};

		return res.status(200).json(response);
	} catch (error) {
		console.error("[loginUser]", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};

export const signupUser = async (req: Request, res: Response) => {
	try {
		const { email, password, displayName } = req.body;

		if (!email || !password || !displayName) {
			return res
				.status(400)
				.json({ message: "Email, password and name are required" });
		}

		if (password.length < 8) {
			return res
				.status(400)
				.json({ message: "Password must be at least 8 characters" });
		}

		const existingEmail = await prismaClient.user.findUnique({
			where: { email },
		});
		if (existingEmail) {
			return res.status(409).json({ message: "Email already in use" });
		}
		let randomUsername = generateUsername(displayName);
		let existingUsername = await prismaClient.user.findUnique({
			where: { username: randomUsername },
		});
		let attempts = 0;

		while (existingUsername && attempts < 5) {
			randomUsername = generateUsername(displayName);

			existingUsername = await prismaClient.user.findUnique({
				where: { username: randomUsername },
			});

			attempts++;
		}
		const hashedPassword = await bcrypt.hash(password, 12);

		const user = await prismaClient.user.create({
			data: {
				email,
				username: randomUsername,
				password: hashedPassword,
				displayName: displayName,
			},
		});

		const token = issueToken(user);

		const response: AuthResponse = {
			token,
			user: safeUser(user),
		};

		return res.status(201).json(response);
	} catch (error) {
		console.error("[signupUser]", error);
		return res.status(500).json({ message: "Internal server error" });
	}
};


export const oauthUser = async (req: Request, res: Response) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ message: "accessToken is required" });
        }

        let githubUser: GitHubUser;

        try {
            githubUser = await getGitHubProfile(accessToken);
        } catch {
            return res.status(401).json({ message: "Invalid GitHub token" });
        }

        let user = await prismaClient.user.findUnique({
            where: { githubId: githubUser.githubId },
        });

        if (!user) {
            // if email already exists but signed up with email and pass
            const existingByEmail = await prismaClient.user.findUnique({
                where: { email: githubUser.email },
            });

            if (existingByEmail) {
                // Link acc to GitHub 
                user = await prismaClient.user.update({
                    where: { id: existingByEmail.id },
                    data: {
                        githubId: githubUser.githubId,
                        avatarUrl: githubUser.avatarUrl,
                    },
                });

                // Ensure the profile exists and holds the verified GitHub username
                await prismaClient.profile.upsert({
                    where: { userId: user.id },
                    create: { 
                        userId: user.id, 
                        githubUsername: githubUser.username 
                    },
                    update: { 
                        githubUsername: githubUser.username 
                    }
                });

                // Trigger the background sync for the linked account
                const platform: SyncPlatform = "github";
                await profileSyncQueue.add(platform, {
                    userId: user.id,
                    handle: githubUser.username,
                    platform,
                });

            } else {
                // new user

                // Username might be taken by someone else registered with it manually
                const username = await resolveUsername(githubUser.username);

                user = await prismaClient.user.create({
                    data: {
                        email: githubUser.email,
                        username,
                        displayName: githubUser.displayName,
                        avatarUrl: githubUser.avatarUrl,
                        githubId: githubUser.githubId,
                        password: null, 
                    },
                });

                // Initialize the blank profile locking in the verified GitHub username
                await prismaClient.profile.create({
                    data: {
                        userId: user.id,
                        githubUsername: githubUser.username,
                    }
                });

                // Trigger the background sync for the brand new user
                const platform: SyncPlatform = "github";
                await profileSyncQueue.add(platform, {
                    userId: user.id,
                    handle: githubUser.username,
                    platform,
                });
            }
        } else {
            // User just logging in normally, update avatar
            user = await prismaClient.user.update({
                where: { id: user.id },
                data: { avatarUrl: githubUser.avatarUrl },
            });
        }
        
        const token = issueToken(user);

        const response: AuthResponse = {
            token,
            user: safeUser(user),
        };

        return res.status(200).json(response);
    } catch (error) {
        console.error("[oauthUser]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const linkGitHub = async (req: Request, res: Response) => {
    try {
        // 1. Ensure the user is authenticated
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ message: "accessToken is required" });
        }

        // 2. Fetch the GitHub profile using the provided token
        let githubUser;
        try {
            githubUser = await getGitHubIdentity(accessToken);
        } catch {
            return res.status(401).json({ message: "Invalid GitHub token" });
        }

        // 3. Security Check: Is this GitHub account already linked to someone else?
        const existingLink = await prismaClient.user.findUnique({
            where: { githubId: githubUser.githubId },
        });

        if (existingLink && existingLink.id !== userId) {
            return res.status(409).json({ 
                message: "This GitHub account is already linked to another DevMatch profile." 
            });
        }

        // 4. Update the User table with the GitHub ID and Avatar
        await prismaClient.user.update({
            where: { id: userId },
            data: {
                githubId: githubUser.githubId,
                avatarUrl: githubUser.avatarUrl,
            },
        });

        // 5. Upsert the Profile table to lock in the verified username
        await prismaClient.profile.upsert({
            where: { userId: userId },
            create: { 
                userId: userId, 
                githubUsername: githubUser.username 
            },
            update: { 
                githubUsername: githubUser.username 
            }
        });

        // 6. Trigger the BullMQ background sync
        const platform: SyncPlatform = "github";
        await profileSyncQueue.add(platform, {
            userId: userId,
            handle: githubUser.username,
            platform,
        });

        return res.status(200).json({ 
            success: true, 
            message: "GitHub account successfully linked and sync triggered." 
        });

    } catch (error) {
        console.error("[linkGitHub]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
