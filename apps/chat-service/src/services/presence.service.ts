import { redisClient } from "../config/redis";
import { prismaClient } from "db/client";

// Peer-list cache TTL. The architecture §6 forbids persisting *presence* in PostgreSQL but
// says nothing about caching the *peer list* (the set of users who share a ChatRoom with
// `userId`). Caching the peer list in Redis cuts a Prisma query on every connect/disconnect
// at the cost of up to PEER_CACHE_TTL seconds of staleness — acceptable because a new
// ChatRoom is only ever created from a `match.accepted` Kafka event handled by this very
// service, so the cache is invalidated (or naturally expires) within seconds of any change.
const PEER_CACHE_TTL_SECONDS = 60;
const PEER_CACHE_KEY = (userId: string) => `peers:${userId}`;

/**
 * Atomic SREM + SCARD. The architecture §9 mandates Lua for atomic Redis operations on
 * the same grounds: the rate-limit pipeline must not race. We apply the same pattern here
 * so the disconnect path cannot observe SCARD=0 while a concurrent connect is mid-flight
 * (the SREM and SCARD must be one indivisible step on the Redis side).
 */
const REMOVE_SOCKET_LUA = `
  local key = KEYS[1]
  local socketId = ARGV[1]
  redis.call('SREM', key, socketId)
  return tonumber(redis.call('SCARD', key))
`;

export const PresenceService = {
  /**
   * Adds a socket to the user's presence set.
   */
  async addSocket(userId: string, socketId: string) {
    await redisClient.sadd(`presence:${userId}`, socketId);
  },

  /**
   * Removes a socket from the user's presence set.
   * Returns the number of active sockets remaining for this user.
   */
  async removeSocket(userId: string, socketId: string): Promise<number> {
    const result = await redisClient.eval(
      REMOVE_SOCKET_LUA,
      1,
      `presence:${userId}`,
      socketId,
    );
    return Number(result);
  },

  /**
   * Checks if a user has at least one active socket.
   */
  async isOnline(userId: string): Promise<boolean> {
    const count = await redisClient.scard(`presence:${userId}`);
    return count > 0;
  },

  /**
   * Fetches the IDs of all users who share an active chat room with this user.
   * Cached in Redis for `PEER_CACHE_TTL_SECONDS` to avoid a Prisma query on every
   * connect/disconnect.
   */
  async getPeers(userId: string): Promise<string[]> {
    const cacheKey = PEER_CACHE_KEY(userId);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Corrupt cache entry — fall through to DB.
      }
    }

    const rooms = await prismaClient.chatRoom.findMany({
      where: {
        match: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
      include: { match: true },
    });

    const peers = new Set<string>();
    rooms.forEach((room) => {
      if (room.match) {
        if (room.match.userAId !== userId) peers.add(room.match.userAId);
        if (room.match.userBId !== userId) peers.add(room.match.userBId);
      }
    });

    const peerList = Array.from(peers);
    await redisClient.set(
      cacheKey,
      JSON.stringify(peerList),
      "EX",
      PEER_CACHE_TTL_SECONDS,
    );

    return peerList;
  },

  /**
   * Invalidates the cached peer list for a user. Called from the `match.accepted`
   * consumer whenever a new ChatRoom is created, so the next presence sync sees the
   * new peer without waiting for TTL.
   */
  async invalidatePeerCache(userId: string) {
    await redisClient.del(PEER_CACHE_KEY(userId));
  },
};
