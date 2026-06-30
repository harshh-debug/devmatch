import { prismaClient } from "db/client";

export const RoomService = {
  /**
   * Creates a room idempotently based on a Kafka match event.
   */
  async createRoomFromMatch(matchId: string) {
    try {
      await prismaClient.chatRoom.create({
        data: { matchId },
      });
      console.log(`[Room Service] Created ChatRoom for Match: ${matchId}`);
    } catch (error: any) {
      // P2002 means the room already exists (idempotency safety)
      if (error.code === "P2002") {
        console.log(`[Room Service] ChatRoom for Match ${matchId} already exists. Skipping.`);
        return;
      }
      throw error;
    }
  },

  /**
   * Validates if a user is mathematically part of the room via the linked Match.
   */
  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await prismaClient.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        match: {
          select: { userAId: true, userBId: true },
        },
      },
    });

    if (!room || !room.match) return false;
    return room.match.userAId === userId || room.match.userBId === userId;
  },

  /**
   * Fetches paginated messages for a validated room.
   */
  async getRoomMessages(roomId: string, cursor?: string, limit: number = 30) {
    const messages = await prismaClient.message.findMany({
      where: { chatRoomId: roomId },
      take: limit,
      skip: cursor ? 1 : 0, // Skip the cursor itself
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return messages;
  },
};