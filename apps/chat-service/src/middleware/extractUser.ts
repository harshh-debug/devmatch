declare global {
	namespace Express {
		interface Request {
			user?: {
				id: string
			};
		}
	}
}
import type { Request, Response, NextFunction } from "express";

export const extractUser = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.headers["x-user-id"] as string;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized: Missing x-user-id header" });
  }

  req.user = { id: userId };
  next();
};