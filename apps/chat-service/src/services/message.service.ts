// src/services/message.service.ts
import { prismaClient } from "db/client";

export const MessageService = {
  async saveMessage(data: {
    roomId: string;
    senderId: string;
    content: string;
    type: "TEXT" | "CODE_SNIPPET" | "LINK";
    clientMessageId: string;
  }) {
    try {
      // 1. Atomic Transaction: Save message AND update room timestamp
      const message = await prismaClient.$transaction(async (tx) => {
        const msg = await tx.message.create({
          data: {
            chatRoomId: data.roomId,
            senderId: data.senderId,
            content: data.content.trim(),
            type: data.type,
            clientMessageId: data.clientMessageId,
          },
        });

        await tx.chatRoom.update({
          where: { id: data.roomId },
          data: { updatedAt: new Date() }, // Or lastMessageAt if you added that specific column
        });

        return msg;
      });

      return message;
    } catch (error: any) {
      // 2. Idempotency Guard (P2002: Unique constraint failed)
      // If the client retried and this message already exists, fetch and return the original one.
      if (error.code === "P2002") {
        console.log(
          `[Message Service] Idempotent hit for clientMessageId: ${data.clientMessageId}`,
        );
        const existingMessage = await prismaClient.message.findUnique({
          where: {
            chatRoomId_senderId_clientMessageId: {
              chatRoomId: data.roomId,
              senderId: data.senderId,
              clientMessageId: data.clientMessageId,
            },
          },
        });

        if (!existingMessage) {
          // The unique constraint fired but we cannot find the row — extremely unlikely
          // (would require a row to be deleted between the failed INSERT and this read).
          // Surface a clear, structured error instead of a generic `Error` so the
          // upstream pipeline can distinguish "idempotency glitch" from a real failure.
          throw new Error(
            `Idempotency resolution failed: unique-constraint fired but message for clientMessageId=${data.clientMessageId} not found`,
          );
        }
        return existingMessage;
      }

      throw error;
    }
  },

  async markMessagesAsRead(roomId: string, readerId: string) {
    await prismaClient.message.updateMany({
      where: {
        chatRoomId: roomId,
        senderId: { not: readerId }, // Do not mark your own messages as read
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  },
};
