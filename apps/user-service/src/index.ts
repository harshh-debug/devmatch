import express from "express";
import helmet from "helmet";
import { createServer } from "node:http";
import prismaClient from "db/client";
import { retryUntilReady } from "@devmatch/shared";
import { profileSyncQueue } from "@devmatch/bullmq";
import { getProducer, disconnectAll } from "@devmatch/kafka";
import { userRouter } from "./routes/user.routes";
import { startOutboxDispatcher, stopOutboxDispatcher } from "./services/outbox.dispatcher";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const port = Number(process.env.PORT ?? 3003);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid port number");
required("JWT_SECRET");
required("DATABASE_URL");
if (process.env.NODE_ENV === "production") {
  required("REDIS_URL");
  required("KAFKA_BROKERS");
}

const app = express();
const server = createServer(app);
let ready = false;
let shuttingDown = false;

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use("/api/v1", userRouter);
app.get("/health/live", (_req, res) => res.json({ status: "ok", service: "user-service" }));
app.get("/health/ready", (_req, res) => {
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not_ready", service: "user-service" });
});
app.get("/health", (_req, res) => res.json({ status: ready ? "ok" : "starting", service: "user-service" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[User Service Error]:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  const dependenciesReady = await retryUntilReady(
    "User service dependencies",
    async () => {
      await prismaClient.$queryRawUnsafe("SELECT 1");
      await profileSyncQueue.waitUntilReady();
      await getProducer();
    },
    { shouldStop: () => shuttingDown },
  );

  if (dependenciesReady) {
    startOutboxDispatcher();
    ready = true;
    console.log("User service dependencies are ready.");
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  console.log(`User service received ${signal}; draining connections.`);
  await stopOutboxDispatcher();
  await Promise.allSettled([profileSyncQueue.close(), disconnectAll()]);
  server.close(async (error) => {
    await prismaClient.$disconnect();
    if (error) process.exitCode = 1;
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

server.listen(port, () => {
  console.log(`User service running on port ${port}`);
  void bootstrap();
});
