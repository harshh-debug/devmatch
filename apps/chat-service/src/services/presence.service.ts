import { redisClient } from "../config/redis";
import { prismaClient } from "db/client";

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
    await redisClient.srem(`presence:${userId}`, socketId);
    return redisClient.scard(`presence:${userId}`); 
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
   * We use this to scope presence broadcasts for privacy.
   */
  async getPeers(userId: string): Promise<string[]> {
    const rooms = await prismaClient.chatRoom.findMany({
      where: {
        match: {
          OR: [{ userAId: userId }, { userBId: userId }]
        }
      },
      include: { match: true }
    });

    const peers = new Set<string>();
    rooms.forEach(room => {
      if (room.match) {
        if (room.match.userAId !== userId) peers.add(room.match.userAId);
        if (room.match.userBId !== userId) peers.add(room.match.userBId);
      }
    });

    return Array.from(peers);
  }
};