import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { env } from "./config/env";
import { roomRoutes } from "./routes/room.routes";
import { startRoomConsumers } from "./consumers/matchAccepted.consumer";
import { Server as SocketIOServer } from "socket.io";
import { initializeSocketIO } from "./sockets/connection.handler";
import { redisClient } from "./config/redis";
import { disconnectAll } from "@devmatch/kafka";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: env.ALLOWED_ORIGIN },
});
initializeSocketIO(io);
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGIN }));
app.use(express.json());

// Mount REST Routes
app.use("/api/v1/chat/rooms", roomRoutes);

// Health Check
app.get("/health/live", (_req, res) => res.status(200).json({ status: "ok", service: "chat-service" }));
app.get("/health/ready", (_req, res) => res.status(200).json({ status: "ok", service: "chat-service" }));
app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "chat-service" }));

async function bootstrap() {
  try {
    // Start Kafka Consumers
    await startRoomConsumers();

    httpServer.listen(env.PORT, () => {
      console.log(`🚀 Chat Service (REST) running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Fatal error during Chat Service bootstrap:", error);
    process.exit(1);
  }
}

bootstrap();

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Chat service received ${signal}; draining connections.`);
  io.close();
  await Promise.allSettled([disconnectAll(), redisClient.quit()]);
  httpServer.close((error) => {
    if (error) {
      console.error("Chat service shutdown error", error);
      process.exitCode = 1;
    }
    process.exit();
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
