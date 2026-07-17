import type { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profile.service";
import { intentService } from "../services/intent.service";
import { buildSkillVector, normalizeSkillTags } from "@devmatch/shared";
import {
	updateMeSchema,
	updateSkillsSchema,
} from "../validators/user.validators";
import { publish, TOPICS } from "@devmatch/kafka";

function toPublicProfile(user: NonNullable<Awaited<ReturnType<typeof profileService.getProfileByUserId>>>) {
	const { email, password, githubId, profile, ...identity } = user;
	const { skillVector, ...metrics } = profile ?? {};
	return {
		...identity,
		...metrics,
		profileCompleteness: profile?.profileScore,
	};
}

export const profileHandler = {
	async getMe(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;
			const [user, intentState] = await Promise.all([
				profileService.getProfileByUserId(userId),
				intentService.getIntentState(userId),
			]);

			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			res.json({
				...user,
				searchIntentType: intentState.searchIntentType ?? null,
				intentType: intentState.searchIntentType ?? null,
				matchingOnboardingComplete: Boolean(
					intentState.searchIntent?.completeness.offerComplete &&
					intentState.searchIntent.completeness.searchComplete
				),
			});
		} catch (error) {
			next(error);
		}
	},

	async getUser(req: Request, res: Response, next: NextFunction) {
		try {
			const { id } = req.params;

			if (typeof id !== "string") {
				return res.status(400).json({ message: "Invalid user id" });
			}

			const user = await profileService.getProfileByUserId(id);

			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}

			res.json(toPublicProfile(user));
		} catch (error) {
			next(error);
		}
	},

	async searchUsers(req: Request, res: Response, next: NextFunction) {
		try {
			const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
			if (query.length < 2) return res.json([]);

			const users = await profileService.searchPublicProfiles(query);
			res.json(users.map(toPublicProfile));
		} catch (error) {
			next(error);
		}
	},

	async checkUsername(req: Request, res: Response, next: NextFunction) {
		try {
			const username = typeof req.query.username === "string" ? req.query.username.trim() : "";
			if (username.length < 3) return res.json({ available: false });
			res.json({ available: await profileService.isUsernameAvailable(username, req.user!.id) });
		} catch (error) {
			next(error);
		}
	},

	async updateMe(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;
			const parsed = updateMeSchema.safeParse(req.body);

			if (!parsed.success) {
				return res.status(400).json({
					errors: parsed.error.format(),
				});
			}

			const updatedUser = await profileService.updateUser(
				userId,
				parsed.data,
			);

			await profileService.computeProfileScore(userId);
			await publish(TOPICS.USER_UPDATED, { userId });

			res.json(updatedUser);
		} catch (error) {
			next(error);
		}
	},

	async updateSkills(req: Request, res: Response, next: NextFunction) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;
			const parsed = updateSkillsSchema.safeParse(req.body);

			if (!parsed.success) {
				return res.status(400).json({
					errors: parsed.error.format(),
				});
			}

			// 1. Save the raw tags and handles
			const profileUpdate = {
				...parsed.data,
				...(parsed.data.skillTags
					? { skillTags: normalizeSkillTags(parsed.data.skillTags) }
					: {}),
			};
			const updatedProfile = await profileService.upsertProfile(
				userId,
				profileUpdate,
			);

			// 2. Compute the mathematical skill vector
			const vector = buildSkillVector(updatedProfile);

			// 3. Save the vector to the DB
			await profileService.updateSkillVector(userId, vector);

			// 4. Update completion score
			await profileService.computeProfileScore(userId);

			// 5. Broadcast to Kafka for the match-service
			await publish(TOPICS.PROFILE_UPDATED, {
				userId,
				skillVector: vector,
				skillTags: updatedProfile.skillTags,
			});
			updatedProfile.skillVector = vector;

			res.json({
				success: true,
				profile: updatedProfile,
			});
		} catch (error) {
			next(error);
		}
	},
};
