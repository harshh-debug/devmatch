import express from "express";
import { createServer } from "node:http";
import prismaClient from "db/client";
import { retryUntilReady } from "@devmatch/shared";
import { profileSyncQueue } from "@devmatch/bullmq";
import authRouter from "./routes/authRoutes";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const port = Number(required("PORT"));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number");
}
required("JWT_SECRET");
required("DATABASE_URL");
if (process.env.NODE_ENV === "production") required("REDIS_URL");

const app = express();
const server = createServer(app);
let ready = false;
let shuttingDown = false;

app.use(express.json({ limit: "1mb" }));
app.use("/api/v1/auth", authRouter);
app.get("/health/live", (_req, res) => res.json({ status: "ok", service: "auth-service" }));
app.get("/health/ready", (_req, res) => {
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not_ready", service: "auth-service" });
});
app.get("/health", (_req, res) => res.json({ status: ready ? "ok" : "starting", service: "auth-service" }));

async function bootstrap() {
  const dependenciesReady = await retryUntilReady(
    "Auth service database",
    async () => {
      await prismaClient.$queryRawUnsafe("SELECT 1");
      await profileSyncQueue.waitUntilReady();
    },
    { shouldStop: () => shuttingDown },
  );

  if (dependenciesReady) {
    ready = true;
    console.log("Auth service database connection is ready.");
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  console.log(`Auth service received ${signal}; draining connections.`);
  server.close(async (error) => {
    await Promise.allSettled([profileSyncQueue.close(), prismaClient.$disconnect()]);
    if (error) process.exitCode = 1;
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

server.listen(port, () => {
  console.log(`Auth service is listening on ${port}`);
  void bootstrap();
});
