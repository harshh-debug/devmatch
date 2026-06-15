import type { Request, Response, NextFunction } from "express";
import { intentService } from "../services/intent.service";
import { setIntentSchema } from "../validators/user.validators";

export const intentHandler = {
	async getIntent(
		req: Request,
		res: Response,
		next: NextFunction,
	) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;
			const intent = await intentService.getActiveIntent(userId);

			res.json({ intent: intent || null });
		} catch (error) {
			next(error);
		}
	},

	async setIntent(
		req: Request,
		res: Response,
		next: NextFunction,
	) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;
			const parsed = setIntentSchema.safeParse(req.body);

			if (!parsed.success) {
				return res.status(400).json({
					errors: parsed.error.format(),
				});
			}

			const newIntent = await intentService.setIntent(
				userId,
				parsed.data,
			);

			res.json(newIntent);
		} catch (error) {
			next(error);
		}
	},

	async deleteIntent(
		req: Request,
		res: Response,
		next: NextFunction,
	) {
		try {
			if (!req.user?.id) {
				return res.status(401).json("Unauthorized");
			}

			const userId = req.user.id;

			await intentService.deleteIntent(userId);

			res.json({ success: true });
		} catch (error) {
			next(error);
		}
	},
};