// src/sockets/events/read.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";
import { MessageService } from "../../services/message.service";

export function registerReadEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on("chat:read", async (payload) => {
    const { roomId } = payload;

    const isParticipant = await RoomService.isUserInRoom(roomId, userId);
    if (!isParticipant) return;

    try {
      const readAt = new Date().toISOString();
      
      // 1. Bulk update PostgreSQL
      await MessageService.markMessagesAsRead(roomId, userId);

      // 2. Notify the other participant that their messages were read
      socket.to(roomId).emit("chat:read:update", { roomId, readerId: userId, readAt });

      // 3. Multi-Tab Sync: Emit to the reader's OWN personal room
      // This tells their other open tabs to clear the unread UI badges
      io.to(userId).emit("chat:read:update", { roomId, readerId: userId, readAt });
      
    } catch (error) {
      // We log but don't crash or emit an error back. 
      // If a read receipt drops, the next time they open the room it will retry.
      console.error(`[Read Event] Failed to update read status for room ${roomId}`, error);
    }
  });
}