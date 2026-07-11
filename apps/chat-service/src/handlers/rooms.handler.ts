import type { Request, Response } from "express";
import { prismaClient } from "db/client";

/**
 * GET /api/v1/chat/rooms
 *
 * Returns all chat rooms the authenticated user is a participant of,
 * with the latest message preview and unread count per room.
 *
 * A new user with no matches will receive [] — not a 404.
 */
export const getRooms = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user.id;

    // Find all chat rooms where the user is either userA or userB on the linked Match.
    const rooms = await prismaClient.chatRoom.findMany({
      where: {
        match: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
      include: {
        match: {
          select: {
            userAId: true,
            userBId: true,
            intentType: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            senderId: true,
            createdAt: true,
            readAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = rooms.map((room) => {
      const lastMessage = room.messages[0] ?? null;

      // A room has an unread message if the last message was sent by the other user
      // and hasn't been read yet. This is a lightweight heuristic for the sidebar badge.
      const hasUnread =
        lastMessage !== null &&
        lastMessage.senderId !== userId &&
        lastMessage.readAt === null;

      return {
        id: room.id,
        matchId: room.matchId,
        intentType: room.match?.intentType ?? null,
        otherUserId:
          room.match?.userAId === userId
            ? room.match?.userBId
            : room.match?.userAId,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: hasUnread ? 1 : 0,
        updatedAt: room.updatedAt,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Rooms Handler] Error fetching rooms:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
