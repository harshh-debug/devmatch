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
  async getRoomMessages(
    roomId: string,
    cursor?: string,
    limit: number = 30,
  ) {
    let cursorDate: Date | undefined;
    if (cursor) {
      const parsed = new Date(cursor);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error("Invalid cursor: must be an ISO 8601 timestamp");
      }
      cursorDate = parsed;
    }

    return prismaClient.message.findMany({
      where: {
        chatRoomId: roomId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Returns the sender of the latest unread message in a room (used to fan out
   * `chat:read:update` to the correct personal room). Returns null if there are no
   * unread messages from the other participant.
   */
  async getLastUnreadSender(
    roomId: string,
    readerId: string,
  ): Promise<string | null> {
    const last = await prismaClient.message.findFirst({
      where: {
        chatRoomId: roomId,
        senderId: { not: readerId },
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { senderId: true },
    });
    return last?.senderId ?? null;
  },
};
