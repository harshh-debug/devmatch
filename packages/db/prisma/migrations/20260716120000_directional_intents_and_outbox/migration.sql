-- Directional intent state replaces the legacy multi-row active intent model.
DROP TABLE IF EXISTS "MatchIntent";

CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED');
CREATE TYPE "MatchCompatibility" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');
CREATE TYPE "MatchLevelSource" AS ENUM ('CODEFORCES', 'LEETCODE', 'MIXED_CP', 'GITHUB', 'UNKNOWN');
CREATE TYPE "MatchTier" AS ENUM ('STRICT', 'RELAXED_PREFERENCES');

ALTER TABLE "User"
ADD COLUMN "matchPreferencesRevision" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Profile"
ADD COLUMN "githubTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "githubLastSyncedAt" TIMESTAMP(3);

CREATE TABLE "SearchIntent" (
    "userId" TEXT NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "ratingMin" INTEGER,
    "ratingMax" INTEGER,
    "preferredLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "preferredDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchIntent_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "OpenToIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpenToIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpenToIntent_userId_intentType_key"
ON "OpenToIntent"("userId", "intentType");
CREATE INDEX "OpenToIntent_intentType_idx" ON "OpenToIntent"("intentType");
CREATE INDEX "OutboxEvent_status_nextAttemptAt_idx"
ON "OutboxEvent"("status", "nextAttemptAt");
CREATE INDEX "OutboxEvent_aggregateId_idx" ON "OutboxEvent"("aggregateId");

ALTER TABLE "SearchIntent"
ADD CONSTRAINT "SearchIntent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpenToIntent"
ADD CONSTRAINT "OpenToIntent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Match"
ALTER COLUMN "similarityScore" DROP NOT NULL,
ADD COLUMN "compatibility" "MatchCompatibility",
ADD COLUMN "levelSource" "MatchLevelSource",
ADD COLUMN "matchTier" "MatchTier",
ADD COLUMN "matchedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "explanation" JSONB;

ALTER TABLE "MatchAction"
ADD COLUMN "similarityScore" DOUBLE PRECISION,
ADD COLUMN "compatibility" "MatchCompatibility",
ADD COLUMN "levelSource" "MatchLevelSource",
ADD COLUMN "matchTier" "MatchTier",
ADD COLUMN "matchedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "explanation" JSONB;
