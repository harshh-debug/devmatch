import type { Request, Response } from "express";
import { RoomService } from "../services/room.service";

const DEFAULT_LIMIT = 30;
// Cap per-page size so a malicious client cannot pull a giant history in one request.
// This is purely a safety net; the architecture does not require it but does not forbid it.
const MAX_LIMIT = 100;

export const getMessages = async (req: Request, res: Response) => {
  try {
    // The route is `/:roomId/messages` — Express's path matcher guarantees `roomId` is
    // a string at runtime, even though @types/express types it as `string | string[] |
    // undefined` to cover the catch-all `*` case. Coerce here so the rest of the
    // handler can treat it as a plain string.
    const roomId = String(req.params.roomId ?? "");

    if (!roomId) {
      return res
        .status(400)
        .json({ success: false, message: "Room ID is required" });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId = req.user.id;

    // Parse & clamp pagination params. A bad `limit` is treated as the default rather
    // than 400 — the client will just get the default page size, which is harmless.
    const rawLimit =
      typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : DEFAULT_LIMIT;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    // Security check: Must be a participant
    const isParticipant = await RoomService.isUserInRoom(roomId, userId);
    if (!isParticipant) {
      console.warn(
        `[Security] User ${userId} attempted to read room ${roomId}`,
      );
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const messages = await RoomService.getRoomMessages(roomId, cursor, limit);
    const lastMessage = messages.at(-1);

    return res.status(200).json({
      success: true,
      data: {
        messages,
        // The cursor is the `createdAt` of the last message on this page. Returning null
        // when we have not filled the page tells the client "no more history".
        nextCursor:
          messages.length === limit
            ? (lastMessage?.createdAt.toISOString() ?? null)
            : null,
      },
    });
  } catch (error: any) {
    if (error?.message?.startsWith?.("Invalid cursor")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("[Room Handler] Error fetching messages:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
