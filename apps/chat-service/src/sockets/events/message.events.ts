// src/sockets/events/message.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";
import { MessageService } from "../../services/message.service";
import { RateLimiterService } from "../../services/rateLimiter.service";
import {
  ChatErrorCode,
  JoinRoomPayloadSchema,
  LeaveRoomPayloadSchema,
  MessagePayloadSchema,
} from "../schemas";

export function registerMessageEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // 1. Explicit Room Joining
  // Clients must request to join a specific chat UI to receive live messages
  socket.on("chat:room:join", async (payload, callback) => {
    const parsed = JoinRoomPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      if (callback) callback({ success: false, error: ChatErrorCode.VALIDATION_FAILED });
      return;
    }
    const { roomId } = parsed.data;

    try {
      const isParticipant = await RoomService.isUserInRoom(roomId, userId);
      if (!isParticipant) {
        return callback && callback({ success: false, error: ChatErrorCode.FORBIDDEN });
      }

      socket.join(roomId);
      console.log(`[Socket] User ${userId} joined UI room ${roomId}`);

      if (callback) callback({ success: true });
    } catch (error) {
      if (callback) callback({ success: false, error: "INTERNAL_ERROR" });
    }
  });

  socket.on("chat:room:leave", (payload) => {
    const parsed = LeaveRoomPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      // A bad leave payload is a no-op (the client is just unsubscribing itself).
      return;
    }
    socket.leave(parsed.data.roomId);
  });

  // 2. The Core Messaging Pipeline
  socket.on("chat:message", async (payload) => {
    const parsed = MessagePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      // Client is the source of truth for the message; it owns the clientMessageId.
      // We surface a `VALIDATION_FAILED` error with the ID so the client can mark its
      // local copy as rejected.
      const clientMessageId =
        typeof payload === "object" && payload !== null && "clientMessageId" in payload
          ? String((payload as Record<string, unknown>).clientMessageId)
          : undefined;
      return socket.emit("chat:error", {
        code: ChatErrorCode.VALIDATION_FAILED,
        clientMessageId,
      });
    }
    const { roomId, content, type, clientMessageId } = parsed.data;

    try {
      // Step A: Rate Limiting (now the FIRST check after validation; ordering is
      // chosen so a spamming client cannot drive DB load via repeated "FORBIDDEN"
      // responses or repeated membership checks).
      const isAllowed = await RateLimiterService.checkLimit(userId, roomId);
      if (!isAllowed) {
        console.warn(
          `[Rate Limit] User ${userId} is sending too fast in room ${roomId}`,
        );
        return socket.emit("chat:error", {
          code: ChatErrorCode.RATE_LIMITED,
          message: "You are sending messages too quickly. Please wait a moment.",
          clientMessageId,
        });
      }

      // Step B: Security/Membership Check
      const isParticipant = await RoomService.isUserInRoom(roomId, userId);
      if (!isParticipant) {
        console.warn(
          `[Security] ${userId} attempted to send to unauthorized room ${roomId}`,
        );
        return socket.emit("chat:error", {
          code: ChatErrorCode.FORBIDDEN,
          clientMessageId,
        });
      }

      // Step C: Persist to PostgreSQL (Wait before broadcasting — architecture §4:
      // Write-then-Broadcast)
      const message = await MessageService.saveMessage({
        roomId,
        senderId: userId,
        content,
        type,
        clientMessageId,
      });

      // Step D: Broadcast to the room (excludes the sender)
      socket.to(roomId).emit("chat:message:new", {
        id: message.id,
        roomId: message.chatRoomId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      });

      // Step E: Send Acknowledgment back to the sender
      socket.emit("chat:message:ack", {
        clientMessageId,
        serverId: message.id,
        status: "sent",
      });
    } catch (error) {
      console.error(
        `[Message Pipeline] Failed to process message ${clientMessageId}:`,
        error,
      );
      socket.emit("chat:error", {
        code: ChatErrorCode.PERSISTENCE_FAILED,
        clientMessageId,
      });
    }
  });
}
