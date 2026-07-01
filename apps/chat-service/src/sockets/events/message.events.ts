// src/sockets/events/message.events.ts
import type { Socket, Server } from "socket.io";
import { RoomService } from "../../services/room.service";
import { MessageService } from "../../services/message.service";
import { RateLimiterService } from "../../services/rateLimiter.service";

export function registerMessageEvents(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // 1. Explicit Room Joining
  // Clients must request to join a specific chat UI to receive live messages
  socket.on("chat:room:join", async (payload, callback) => {
    try {
      const { roomId } = payload;
      
      const isParticipant = await RoomService.isUserInRoom(roomId, userId);
      if (!isParticipant) {
        return callback && callback({ success: false, error: "FORBIDDEN" });
      }

      socket.join(roomId);
      console.log(`[Socket] User ${userId} joined UI room ${roomId}`);
      
      if (callback) callback({ success: true });
    } catch (error) {
      if (callback) callback({ success: false, error: "INTERNAL_ERROR" });
    }
  });

  socket.on("chat:room:leave", (payload) => {
    socket.leave(payload.roomId);
  });

  // 2. The Core Messaging Pipeline
  socket.on("chat:message", async (payload) => {
    const { roomId, content, type, clientMessageId } = payload;

    try {
      // Step A: Basic Validation
      if (!content || !content.trim() || content.length > 5000) {
        return socket.emit("chat:error", { code: "VALIDATION_FAILED", clientMessageId });
      }
      // 🚨 NEW: Step A.5: Rate Limiting
      const isAllowed = await RateLimiterService.checkLimit(userId, roomId);
      if (!isAllowed) {
        console.warn(`[Rate Limit] User ${userId} is sending too fast in room ${roomId}`);
        return socket.emit("chat:error", { 
          code: "RATE_LIMITED", 
          message: "You are sending messages too quickly. Please wait a moment.",
          clientMessageId 
        });
      }

      // Step B: Security/Membership Check
      const isParticipant = await RoomService.isUserInRoom(roomId, userId);
      if (!isParticipant) {
        console.warn(`[Security] ${userId} attempted to send to unauthorized room ${roomId}`);
        return socket.emit("chat:error", { code: "FORBIDDEN", clientMessageId });
      }

      // Step C: Persist to PostgreSQL (Wait before broadcasting)
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
      console.error(`[Message Pipeline] Failed to process message ${clientMessageId}:`, error);
      socket.emit("chat:error", { code: "PERSISTENCE_FAILED", clientMessageId });
    }
  });
}