/*
  Warnings:

  - A unique constraint covering the columns `[userAId,userBId,intentType]` on the table `Match` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Match_userAId_userBId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Match_userAId_userBId_intentType_key" ON "Match"("userAId", "userBId", "intentType");

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
