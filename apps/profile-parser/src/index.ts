import "dotenv/config";
import { createServer } from "node:http";
import prismaClient from "db/client";
import { disconnectAll, getProducer } from "@devmatch/kafka";
import { profileSyncWorker } from "./queue/worker";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const healthPort = Number(process.env.WORKER_HEALTH_PORT ?? 3010);
if (!Number.isInteger(healthPort) || healthPort < 1 || healthPort > 65535) {
  throw new Error("WORKER_HEALTH_PORT must be a valid port number");
}
required("DATABASE_URL");
required("REDIS_URL");
if (process.env.NODE_ENV === "production") required("KAFKA_BROKERS");

let ready = false;
let shuttingDown = false;
const healthServer = createServer((request, response) => {
  if (request.url === "/health/live") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "profile-parser" }));
    return;
  }
  if (request.url === "/health/ready" || request.url === "/health") {
    response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: ready ? "ok" : "not_ready", service: "profile-parser" }));
    return;
  }
  response.writeHead(404).end();
});

async function bootstrap() {
  console.log("Starting Profile Parser Worker...");
  try {
    await prismaClient.$queryRawUnsafe("SELECT 1");
    await getProducer();
    profileSyncWorker.run();
    await profileSyncWorker.waitUntilReady();
    ready = true;
    console.log("Profile Parser worker is ready for profile-sync jobs.");
  } catch (error) {
    console.error("Profile Parser failed its readiness check", error);
  }
}

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  ready = false;
  console.log(`Profile Parser received ${signal}; draining worker.`);
  await Promise.allSettled([
    profileSyncWorker.close(),
    disconnectAll(),
    prismaClient.$disconnect(),
  ]);
  healthServer.close((error) => {
    if (error) process.exitCode = 1;
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

healthServer.listen(healthPort, () => {
  console.log(`Profile Parser health endpoint is listening on ${healthPort}`);
  void bootstrap();
});
