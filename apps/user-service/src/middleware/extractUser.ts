declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string;
				email: string;
				username: string;
			};
		}
	}
}
import type { NextFunction, Request, Response } from "express";
export const extractUser = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const userId = req.headers["x-user-id"] as string;
	const email = req.headers["x-user-email"] as string;
	const username = req.headers["x-user-username"] as string;

	if (!userId || !email || !username) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	req.user = { id: userId, email, username };
	next();
};
