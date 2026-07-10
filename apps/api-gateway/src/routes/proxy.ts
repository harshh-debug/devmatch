import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJWT } from "../middleware/auth";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL!;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL!;
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL!;
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL!;
const BADGE_SERVICE_URL = process.env.BADGE_SERVICE_URL!;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL!;
const proxyRoutes = Router();

function proxy(target: string) {
	return createProxyMiddleware({
		target,
		changeOrigin: true,
		on: {
			error: (err, req, res: any) => {
				console.error(`[proxy] upstream error → ${target}`, err.message);
				res.status(502).json({ error: "Upstream service unavailable" });
			},
		},
	});
}

proxyRoutes.use("/auth/link", verifyJWT, proxy(AUTH_SERVICE_URL));
proxyRoutes.use("/auth", proxy(AUTH_SERVICE_URL));

// Public profile pages — anyone can view a developer's public profile.
// e.g. GET /api/v1/users/public/harsh-dev
proxyRoutes.use("/users/public", proxy(USER_SERVICE_URL));

proxyRoutes.use("/users", verifyJWT, proxy(USER_SERVICE_URL));
proxyRoutes.use("/match", verifyJWT, proxy(MATCH_SERVICE_URL));
proxyRoutes.use("/chat", verifyJWT, proxy(CHAT_SERVICE_URL));
proxyRoutes.use("/badges", verifyJWT, proxy(BADGE_SERVICE_URL));
proxyRoutes.use("/notifications", verifyJWT, proxy(NOTIFICATION_SERVICE_URL));

export default proxyRoutes;
