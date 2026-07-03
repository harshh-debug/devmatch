// Centralized Zod schemas for all Socket.io event payloads.
//
// Why centralize: every socket handler is an unauthenticated-in-content boundary. The JWT
// only proves who the socket belongs to; it does not prove the payload is well-shaped.
// Validating at the handler boundary (a) prevents TypeErrors from leaking into the
// persistence path, (b) gives clients actionable error codes, and (c) keeps the service
// safe against tampering even by an authenticated user.

import { z } from "zod";

// Matches the Prisma `MessageType` enum in packages/db/prisma/schema.prisma
const MessageTypeSchema = z.enum(["TEXT", "CODE_SNIPPET", "LINK"]);

const RoomIdSchema = z.string().uuid({ message: "roomId must be a UUID" });

const ClientMessageIdSchema = z
  .string()
  .min(1)
  .max(128);

export const JoinRoomPayloadSchema = z.object({
  roomId: RoomIdSchema,
});

export const LeaveRoomPayloadSchema = z.object({
  roomId: RoomIdSchema,
});

export const MessagePayloadSchema = z.object({
  roomId: RoomIdSchema,
  content: z
    .string()
    .min(1, "content must not be empty")
    .max(5000, "content must not exceed 5000 characters"),
  type: MessageTypeSchema,
  clientMessageId: ClientMessageIdSchema,
});

export const ReadPayloadSchema = z.object({
  roomId: RoomIdSchema,
});

export const TypingPayloadSchema = z.object({
  roomId: RoomIdSchema,
  isTyping: z.boolean(),
});

// Discriminated union of error codes emitted on `chat:error` so the client can branch.
export const ChatErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  FORBIDDEN: "FORBIDDEN",
  PERSISTENCE_FAILED: "PERSISTENCE_FAILED",
} as const;

export type ChatErrorCodeValue = (typeof ChatErrorCode)[keyof typeof ChatErrorCode];
