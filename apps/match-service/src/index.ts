import express from "express";
import dotenv from "dotenv";
import { createServer } from "node:http";
import prismaClient from "db/client";
import { createTopicsIfNotExist, disconnectAll } from "@devmatch/kafka";
import { matchRoutes } from "./routes/match.routes";
import { startCacheReconciliation, stopCacheReconciliation, warmVectorCache } from "./services/cache/vectorCache";
import { redisClient } from "./services/cache/redis";
import { startKafkaConsumers } from "./services/kafka/consumer";

dotenv.config();

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const port = Number(process.env.PORT ?? 3004);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid port number");
required("DATABASE_URL");
if (process.env.NODE_ENV === "production") {
  required("REDIS_URL");
  required("KAFKA_BROKERS");
}

const app = express();
const server = createServer(app);
let ready = false;
let shuttingDown = false;

app.use(express.json({ limit: "1mb" }));
app.get("/health/live", (_req, res) => res.status(200).json({ status: "ok", service: "match-service" }));
app.get("/health/ready", (_req, res) => {
  res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "not_ready", service: "match-service" });
});
app.get("/health", (_req, res) => res.status(200).json({ status: ready ? "ok" : "starting", service: "match-service" }));
app.use("/api/v1/match", matchRoutes);

async function bootstrap() {
  try {
    console.log("Starting Match Service Boot Sequence...");
    await prismaClient.$queryRawUnsafe("SELECT 1");
    await redisClient.ping();
    await warmVectorCache();
    await createTopicsIfNotExist();
    await startKafkaConsumers();
    startCacheReconciliation();
    ready = true;
    console.log("Match service dependencies and cache are ready.");
  } catch (error) {
    console.error("Match service failed its readiness check", error);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  console.log(`Match service received ${signal}; draining connections.`);
  stopCacheReconciliation();
  await Promise.allSettled([disconnectAll(), redisClient.quit(), prismaClient.$disconnect()]);
  server.close((error) => {
    if (error) process.exitCode = 1;
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

server.listen(port, () => {
  console.log(`Match Service is listening on ${port}`);
  void bootstrap();
});
