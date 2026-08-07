import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimit";
import proxyRoutes, { chatSocketProxy } from "./routes/proxy";
import cors from "cors";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import { env } from "./config/env";

const app = express();
const httpServer = createServer(app);
let shuttingDown = false;

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGIN }));

app.get("/health/live", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "api-gateway" });
});
app.get("/health/ready", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "api-gateway" });
});
// Backwards-compatible local health route.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.use(rateLimiter);
app.use("/api/v1", proxyRoutes);
app.use("/socket.io", chatSocketProxy);

httpServer.on("upgrade", (request, socket, head) => {
  if (request.url?.startsWith("/socket.io")) {
    chatSocketProxy.upgrade?.(request, socket as Socket, head);
    return;
  }
  socket.destroy();
});

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`API gateway received ${signal}; draining connections.`);
  httpServer.close((error) => {
    if (error) {
      console.error("API gateway shutdown error", error);
      process.exitCode = 1;
    }
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

httpServer.listen(env.API_GATEWAY_PORT, () => {
  console.log(`API gateway is listening at ${env.API_GATEWAY_PORT}`);
});
