import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

export const rateLimiter = rateLimit({
	windowMs: env.RATE_LIMIT_WINDOW_MS,
	limit: env.RATE_LIMIT_MAX_PER_IP,
	message: { error: "Too many requests, slow down" },
	standardHeaders: "draft-8",
	legacyHeaders: false,
});
