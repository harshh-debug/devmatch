import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
interface MyJwtPayload extends jwt.JwtPayload {
	id: string;
	email: string;
	username: string;
}
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
export const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
	const JWT_SECRET = process.env.JWT_SECRET;
	if (!JWT_SECRET) {
		throw new Error("jwt secret not defined");
	}
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) return res.status(401).json({ error: "No token" });
	try {
		const payload = jwt.verify(token, JWT_SECRET) as MyJwtPayload;
		req.user = {
			id: payload.id,
			email: payload.email,
			username: payload.username,
		};

		// Inject into headers so downstream services can read them
		req.headers["x-user-id"] = payload.id;
		req.headers["x-user-email"] = payload.email;
		req.headers["x-user-username"] = payload.username;

		next();
	} catch {
		return res.status(401).json({ error: "Invalid token" });
	}
};
