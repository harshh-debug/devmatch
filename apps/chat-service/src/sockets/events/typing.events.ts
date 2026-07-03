// src/sockets/events/typing.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";
import { TypingPayloadSchema } from "../schemas";

// In-memory map to track active typing timeouts across the server.
//
// The architecture §7 mandates a server-side 5-second `setTimeout` (the "dead-man's
// switch") so a chat:typing:true event is *guaranteed* to be followed by an
// `isTyping: false` even if the client crashes or disconnects. This map is keyed by
// `${userId}_${roomId}` and entries MUST be cleared on socket disconnect to prevent
// memory leaks (issue H4) — see the `socket.on("disconnect", ...)` handler at the
// bottom of this file.
const typingTimeouts = new Map<string, NodeJS.Timeout>();

const TYPING_TIMEOUT_MS = 5000;

function clearUserTypingTimeouts(userId: string) {
  // The key is `${userId}_${roomId}`. We iterate the map so we can clear every
  // room's timeout for a disconnecting user without scanning the whole map.
  for (const [key, timeout] of typingTimeouts.entries()) {
    if (key.startsWith(`${userId}_`)) {
      clearTimeout(timeout);
      typingTimeouts.delete(key);
    }
  }
}

export function registerTypingEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on("chat:typing", async (payload) => {
    // Validate payload shape first; a malformed event is silently dropped (the client
    // is the source of truth for its own UI and will not retry a bad payload).
    const parsed = TypingPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn(
        `[Typing] Bad payload from user ${userId}:`,
        parsed.error.issues,
      );
      return;
    }
    const { roomId, isTyping } = parsed.data;

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
        // Guard: the socket may have been removed from the room (via chat:room:leave)
        // between the timeout being scheduled and firing. `socket.to(roomId).emit` on a
        // socket that has left the room is a no-op, which is exactly what we want.
        socket.to(roomId).emit("chat:typing:update", {
          roomId,
          userId,
          isTyping: false,
        });
        typingTimeouts.delete(timeoutKey);
      }, TYPING_TIMEOUT_MS);

      typingTimeouts.set(timeoutKey, timeout);
    } else {
      typingTimeouts.delete(timeoutKey);
    }
  });

  // Clean up all of this user's typing timeouts on disconnect (fix for H4). Without
  // this, the in-memory map grows for every user that ever started typing and then
  // disconnected, and the captured `socket` reference inside each pending setTimeout
  // becomes a stale closure.
  socket.on("disconnect", () => {
    clearUserTypingTimeouts(userId);
  });
}
