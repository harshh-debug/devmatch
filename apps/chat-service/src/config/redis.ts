import Redis from "ioredis";
import { env } from "./env";

// In production, configure this via environment variables
export const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redisClient.on("connect", () => {
  console.log("🟢 [Redis] Chat Service connected for Presence tracking.");
});

redisClient.on("error", (err) => {
  console.error("🔴 [Redis] Connection Error:", err);
});