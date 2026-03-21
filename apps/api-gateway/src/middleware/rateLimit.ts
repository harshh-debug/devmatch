import { rateLimit } from "express-rate-limit";
export const rateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute window
	limit: 100, // 100 requests per IP per window
	message: { error: "Too many requests, slow down" },
	standardHeaders: "draft-8",
	legacyHeaders: false,
});
