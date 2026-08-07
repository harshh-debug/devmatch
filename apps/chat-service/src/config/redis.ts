import Redis from "ioredis";
import { env } from "./env";

// In production, configure this via environment variables
export const redisClient = new Redis(env.REDIS_URL);

redisClient.on("connect", () => {
  console.log("🟢 [Redis] Chat Service connected for Presence tracking.");
});

redisClient.on("error", (err) => {
  console.error("🔴 [Redis] Connection Error:", err);
});
