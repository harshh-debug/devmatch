import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

redisClient.on("error", (err) => {
    console.error("[Redis Error] Cache connection unstable:", err.message);
});

redisClient.on("ready", () => {
    console.log("[Redis] Connected and ready.");
});