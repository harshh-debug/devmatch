import prismaClient from "db/client";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { getGitHubProfile, resolveUsername, type GitHubUser } from "../services/github.services";
import { issueToken } from "../services/token.service";
import { generateUsername, safeUser } from "../services/user.service";



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
			}
		} else {
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

