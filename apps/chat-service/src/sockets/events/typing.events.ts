// src/sockets/events/typing.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";

// In-memory map to track active typing timeouts across the server
const typingTimeouts = new Map<string, NodeJS.Timeout>();

export function registerTypingEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on("chat:typing", async (payload) => {
    const { roomId, isTyping } = payload;

    // 1. Security Check (Even transient events can leak metadata if unchecked)
    const isParticipant = await RoomService.isUserInRoom(roomId, userId);
    if (!isParticipant) return;

    // 2. Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit("chat:typing:update", { roomId, userId, isTyping });

    // 3. The Auto-Expire Safety Mechanism
    const timeoutKey = `${userId}_${roomId}`;
    
    // Clear any existing timeout for this user in this room
    if (typingTimeouts.has(timeoutKey)) {
      clearTimeout(typingTimeouts.get(timeoutKey));
    }

    if (isTyping) {
      // Set a 5-second dead-man's switch
      const timeout = setTimeout(() => {
        socket.to(roomId).emit("chat:typing:update", { roomId, userId, isTyping: false });
        typingTimeouts.delete(timeoutKey);
      }, 5000);
      
      typingTimeouts.set(timeoutKey, timeout);
    } else {
      typingTimeouts.delete(timeoutKey);
    }
  });
}