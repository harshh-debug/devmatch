// src/services/rateLimiter.service.ts
import { redisClient } from "../config/redis";

// Configuration: Allow 20 messages per 60 seconds per user, per room.
const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_MESSAGES_PER_WINDOW = 20;

/**
 * LUA SCRIPT LOGIC:
 * 1. Remove timestamps older than the 60-second window.
 * 2. Count the remaining timestamps.
 * 3. If count >= limit, exit and return 0 (Blocked).
 * 4. If count < limit, insert new timestamp, refresh TTL, and return 1 (Allowed).
 * * Why Lua? Redis is single-threaded. This script executes as a single, indivisible 
 * atomic operation, completely eliminating race conditions and unnecessary RAM bloat.
 */
const SLIDING_WINDOW_LUA = `
  local key = KEYS[1]
  local windowStart = tonumber(ARGV[1])
  local now = tonumber(ARGV[2])
  local maxMessages = tonumber(ARGV[3])
  local ttl = tonumber(ARGV[4])

  redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
  
  local count = tonumber(redis.call('ZCARD', key))
  
  if count >= maxMessages then
    return 0
  end
  
  redis.call('ZADD', key, now, now)
  redis.call('EXPIRE', key, ttl)
  
  return 1
`;

export const RateLimiterService = {
  /**
   * Checks if a user has exceeded their message quota for a specific room.
   * Returns `true` if allowed, `false` if rate-limited.
   */
  async checkLimit(userId: string, roomId: string): Promise<boolean> {
    const key = `rate_limit:${roomId}:${userId}`;
    const now = Date.now();
    const windowStart = now - (WINDOW_SIZE_IN_SECONDS * 1000);

    try {
      // redisClient.eval executes the Lua script directly on the Redis server
      const result = await redisClient.eval(
        SLIDING_WINDOW_LUA,
        1, // The number of keys being passed
        key, // KEYS[1]
        windowStart, // ARGV[1]
        now, // ARGV[2]
        MAX_MESSAGES_PER_WINDOW, // ARGV[3]
        WINDOW_SIZE_IN_SECONDS // ARGV[4]
      );

      // 1 means the script allowed the insertion. 0 means blocked.
      return result === 1;
      
    } catch (error) {
      console.error(`[Rate Limiter] Redis evaluation failed for ${key}:`, error);
      // In a real-time chat, if the rate limiter crashes, we generally "Fail Open"
      // to ensure chat stays online, but log the error heavily.
      return true; 
    }
  }
};