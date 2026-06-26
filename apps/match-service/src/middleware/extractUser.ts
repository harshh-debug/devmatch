import type { Request, Response, NextFunction } from "express";

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

export const extractUser = (req: Request, res: Response, next: NextFunction) => {
    // Read the headers injected by the API Gateway
    const userId = req.headers["x-user-id"] as string;
    const userEmail = req.headers["x-user-email"] as string;
    const username = req.headers["x-user-username"] as string;

    if (!userId) {
        return res.status(401).json({ 
            success: false, 
            message: "Unauthorized: Missing internal gateway headers" 
        });
    }
    req.user = {
        id: userId,
        email: userEmail,
        username: username,
    };

    next();
};