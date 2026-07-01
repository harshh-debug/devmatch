/*
  Warnings:

  - A unique constraint covering the columns `[chatRoomId,senderId,clientMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientMessageId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "clientMessageId" TEXT NOT NULL,
ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Message_chatRoomId_createdAt_idx" ON "Message"("chatRoomId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Message_chatRoomId_senderId_clientMessageId_key" ON "Message"("chatRoomId", "senderId", "clientMessageId");
