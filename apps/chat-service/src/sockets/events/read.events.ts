// src/sockets/events/read.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";
import { MessageService } from "../../services/message.service";
import { ReadPayloadSchema } from "../schemas";

export function registerReadEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on("chat:read", async (payload) => {
    const parsed = ReadPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn(
        `[Read] Bad payload from user ${userId}:`,
        parsed.error.issues,
      );
      return;
    }
    const { roomId } = parsed.data;

    const isParticipant = await RoomService.isUserInRoom(roomId, userId);
    if (!isParticipant) return;

    try {
      // Architecture §2 anti-pattern: never trust a client timestamp. The bulk update
      // uses `now()`; the payload we broadcast carries the same Node-generated
      // timestamp so every recipient agrees on the value.
      const readAt = new Date();

      // 1. Bulk update PostgreSQL
      await MessageService.markMessagesAsRead(roomId, userId);

      // 2. Find the *other* participant so we can target their personal room.
      //    architecture §8 requires the read update to be emitted to BOTH the
      //    sender's and the reader's personal rooms. The reader's is step 3 below;
      //    the sender's is the one we add here.
      const senderId = await RoomService.getLastUnreadSender(roomId, userId);

      const readUpdate = {
        roomId,
        readerId: userId,
        readAt: readAt.toISOString(),
      };

      // 3. Notify the other participant that their messages were read. We emit to
      //    their *personal room* (architecture §3) so they receive the update
      //    regardless of whether they currently have the chat UI open. If the sender
      //    happens to also be joined to the chat UI room, the `socket.to(roomId)`
      //    below is a no-op for them.
      if (senderId) {
        io.to(senderId).emit("chat:read:update", readUpdate);
      }

      // 4. Multi-Tab Sync: Emit to the reader's OWN personal room so their other
      //    open tabs can clear the unread UI badges.
      socket.to(userId).emit("chat:read:update", readUpdate);
    } catch (error) {
      // We log but don't crash or emit an error back.
      // If a read receipt drops, the next time they open the room it will retry.
      console.error(
        `[Read Event] Failed to update read status for room ${roomId}`,
        error,
      );
    }
  });
}
