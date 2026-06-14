import type { Request, Response } from "express";
import { profileService } from "../services/profile.service";
import { vectorService } from "../services/vector.service";
import {
	updateMeSchema,
	updateSkillsSchema,
} from "../validators/user.validators";
import { publish, TOPICS } from "kafka";

export const profileHandler = {
	async getMe(req: Request, res: Response) {
		const userId = req.user!.id;
		const user = await profileService.getProfileByUserId(userId);

		if (!user) return res.status(404).json({ message: "User not found" });
		res.json(user);
	},

	async getUser(req: Request, res: Response) {
		const { id } = req.params;
		if (typeof id !== "string") {
			return res.status(400).json({ message: "Invalid user id" });
		}
		const user = await profileService.getProfileByUserId(id);

		if (!user) return res.status(404).json({ message: "User not found" });

		// Strip sensitive info for public viewing
		const { email, ...publicUser } = user;
		res.json(publicUser);
	},

	async updateMe(req: Request, res: Response) {
		const userId = req.user!.id;
		const parsed = updateMeSchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({ errors: parsed.error.format() });
		}

		const updatedUser = await profileService.updateUser(userId, parsed.data);
		await profileService.computeProfileScore(userId);

		res.json(updatedUser);
	},

	async updateSkills(req: Request, res: Response) {
		const userId = req.user!.id;
		const parsed = updateSkillsSchema.safeParse(req.body);

		if (!parsed.success) {
			return res.status(400).json({ errors: parsed.error.format() });
		}

		// 1. Save the raw tags and handles
		const updatedProfile = await profileService.upsertProfile(
			userId,
			parsed.data,
		);

		// 2. Compute the mathematical skill vector
		const vector = vectorService.buildSkillVector(updatedProfile);

		// 3. Save the vector to the DB
		await profileService.updateSkillVector(userId, vector);

		// 4. Update completion score
		await profileService.computeProfileScore(userId);

		// 5. Broadcast to the Kafka cluster for the match-service
		await publish(TOPICS.PROFILE_UPDATED, {
			userId,
			skillVector: vector,
			skillTags: updatedProfile.skillTags,
		});

		res.json({ success: true, profile: updatedProfile });
	},
};
