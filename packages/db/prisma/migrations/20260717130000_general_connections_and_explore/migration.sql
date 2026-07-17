CREATE TYPE "ConnectionContext" AS ENUM ('DSA', 'HACKATHON', 'PROJECT', 'OPENSOURCE', 'GENERAL');
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'MATCHED');

ALTER TABLE "Match"
ADD COLUMN "connectionContext" "ConnectionContext";

UPDATE "Match"
SET "connectionContext" = "intentType"::text::"ConnectionContext";

ALTER TABLE "Match"
ALTER COLUMN "connectionContext" SET NOT NULL,
ALTER COLUMN "intentType" DROP NOT NULL;

ALTER TABLE "MatchAction"
ADD COLUMN "connectionContext" "ConnectionContext";

UPDATE "MatchAction"
SET "connectionContext" = "intentType"::text::"ConnectionContext";

ALTER TABLE "MatchAction"
ALTER COLUMN "connectionContext" SET NOT NULL,
ALTER COLUMN "intentType" DROP NOT NULL;

DROP INDEX "Match_userAId_userBId_intentType_key";
DROP INDEX "MatchAction_actorId_targetId_intentType_key";
CREATE UNIQUE INDEX "Match_userAId_userBId_key" ON "Match"("userAId", "userBId");
CREATE UNIQUE INDEX "MatchAction_actorId_targetId_connectionContext_key"
ON "MatchAction"("actorId", "targetId", "connectionContext");

CREATE TABLE "ConnectionPair" (
  "pairKey" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "connectionContext" "ConnectionContext" NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectionPair_pkey" PRIMARY KEY ("pairKey")
);

CREATE INDEX "ConnectionPair_userAId_idx" ON "ConnectionPair"("userAId");
CREATE INDEX "ConnectionPair_userBId_idx" ON "ConnectionPair"("userBId");
CREATE INDEX "ConnectionPair_status_idx" ON "ConnectionPair"("status");
