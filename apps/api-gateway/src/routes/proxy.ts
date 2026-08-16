import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "../config/env";
import { verifyJWT } from "../middleware/auth";

const proxyRoutes = Router();

function proxy(target: string) {
	return createProxyMiddleware({
		target,
		changeOrigin: true,
		timeout: 10_000,
		proxyTimeout: 15_000,
		pathRewrite: (path, req) => (req as any).originalUrl,
		on: {
			error: (err, req, res: any) => {
				console.error(`[proxy] upstream error → ${target}`, err.message);
				res.status(502).json({ error: "UPSTREAM_UNAVAILABLE" });
			},
		},
	});
}

export const chatSocketProxy = createProxyMiddleware({
	pathFilter: "/socket.io",
	target: env.CHAT_SERVICE_URL,
	changeOrigin: true,
	ws: true,
	on: {
		error: (err, _req, res: any) => {
			console.error(`[proxy] chat socket upstream error → ${env.CHAT_SERVICE_URL}`, err.message);
			if (res && typeof res.writeHead === "function") {
				res.writeHead(502);
				res.end();
			}
		},
	},
});

proxyRoutes.use("/auth/link", verifyJWT, proxy(env.AUTH_SERVICE_URL));
proxyRoutes.use("/auth", proxy(env.AUTH_SERVICE_URL));

// Public profile pages — anyone can view a developer's public profile.
// e.g. GET /api/v1/users/public/harsh-dev
proxyRoutes.use("/users/public", proxy(env.USER_SERVICE_URL));

proxyRoutes.use("/users", verifyJWT, proxy(env.USER_SERVICE_URL));
proxyRoutes.use("/match", verifyJWT, proxy(env.MATCH_SERVICE_URL));
proxyRoutes.use("/chat", verifyJWT, proxy(env.CHAT_SERVICE_URL));

proxyRoutes.use("/badges", verifyJWT, (_req, res) =>
	res.status(501).json({ error: "SERVICE_NOT_AVAILABLE" }),
);
proxyRoutes.use("/notifications", verifyJWT, (_req, res) =>
	res.status(501).json({ error: "SERVICE_NOT_AVAILABLE" }),
);

export default proxyRoutes;
