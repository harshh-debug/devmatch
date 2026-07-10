import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import { env } from "./config/env";
import { roomRoutes } from "./routes/room.routes";
import { startRoomConsumers } from "./consumers/matchAccepted.consumer";
import { Server as SocketIOServer } from "socket.io";
import { initializeSocketIO } from "./sockets/connection.handler";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" } // Restrict this to your frontend URL in production!
});
initializeSocketIO(io);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount REST Routes
app.use("/api/v1/chat/rooms", roomRoutes);

// Health Check
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

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