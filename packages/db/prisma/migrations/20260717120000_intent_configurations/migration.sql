CREATE TYPE "CollaborationMode" AS ENUM ('SIMILAR', 'COMPLEMENTARY', 'EITHER');
CREATE TYPE "CollaborationRole" AS ENUM (
    'FRONTEND',
    'BACKEND',
    'FULL_STACK',
    'MOBILE',
    'ML_AI',
    'DATA',
    'DEVOPS_CLOUD',
    'BLOCKCHAIN',
    'UI_UX',
    'TESTING_QA',
    'PRODUCT'
);
CREATE TYPE "DsaGoal" AS ENUM ('INTERVIEW_PREP', 'COMPETITIVE_PROGRAMMING');
CREATE TYPE "DsaProviderPreference" AS ENUM ('CODEFORCES', 'LEETCODE', 'EITHER');
CREATE TYPE "OpenSourceContributionType" AS ENUM (
    'CODE',
    'DOCUMENTATION',
    'TESTING',
    'DEVOPS_CI',
    'DESIGN',
    'ISSUE_TRIAGE',
    'PROJECT_MAINTENANCE'
);
CREATE TYPE "ResolvedMatchMode" AS ENUM ('SIMILAR', 'COMPLEMENTARY', 'DIRECT');

CREATE TABLE "IntentConfiguration" (
    "userId" TEXT NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "offeredLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "offeredFrameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "offeredDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "offeredRoles" "CollaborationRole"[] NOT NULL DEFAULT ARRAY[]::"CollaborationRole"[],
    "offeredDsaGoals" "DsaGoal"[] NOT NULL DEFAULT ARRAY[]::"DsaGoal"[],
    "offeredContributionTypes" "OpenSourceContributionType"[] NOT NULL DEFAULT ARRAY[]::"OpenSourceContributionType"[],
    "offeredRepositoryTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requiredLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requiredFrameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requiredDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requiredRoles" "CollaborationRole"[] NOT NULL DEFAULT ARRAY[]::"CollaborationRole"[],
    "requiredDsaGoals" "DsaGoal"[] NOT NULL DEFAULT ARRAY[]::"DsaGoal"[],
    "requiredContributionTypes" "OpenSourceContributionType"[] NOT NULL DEFAULT ARRAY[]::"OpenSourceContributionType"[],
    "requiredRepositoryTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "niceToHaveLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "niceToHaveFrameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "niceToHaveDomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "niceToHaveRoles" "CollaborationRole"[] NOT NULL DEFAULT ARRAY[]::"CollaborationRole"[],
    "niceToHaveDsaGoals" "DsaGoal"[] NOT NULL DEFAULT ARRAY[]::"DsaGoal"[],
    "niceToHaveContributionTypes" "OpenSourceContributionType"[] NOT NULL DEFAULT ARRAY[]::"OpenSourceContributionType"[],
    "niceToHaveRepositoryTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "collaborationMode" "CollaborationMode",
    "dsaProviderPreference" "DsaProviderPreference",
    "codeforcesRatingMin" INTEGER,
    "codeforcesRatingMax" INTEGER,
    "leetcodeGlobalRankBest" INTEGER,
    "leetcodeGlobalRankWorst" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntentConfiguration_pkey" PRIMARY KEY ("userId", "intentType")
);

CREATE INDEX "IntentConfiguration_intentType_idx"
ON "IntentConfiguration"("intentType");

ALTER TABLE "IntentConfiguration"
ADD CONSTRAINT "IntentConfiguration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SearchIntent"
DROP COLUMN "ratingMin",
DROP COLUMN "ratingMax",
DROP COLUMN "preferredLanguages",
DROP COLUMN "preferredDomains";

ALTER TABLE "Match"
DROP COLUMN "matchTier",
ADD COLUMN "resolvedMatchMode" "ResolvedMatchMode",
ADD COLUMN "matchedFrameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedRoles" "CollaborationRole"[] NOT NULL DEFAULT ARRAY[]::"CollaborationRole"[],
ADD COLUMN "matchedDsaGoals" "DsaGoal"[] NOT NULL DEFAULT ARRAY[]::"DsaGoal"[],
ADD COLUMN "matchedContributionTypes" "OpenSourceContributionType"[] NOT NULL DEFAULT ARRAY[]::"OpenSourceContributionType"[],
ADD COLUMN "matchedRepositoryTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "niceToHaveMatchedGroups" INTEGER,
ADD COLUMN "niceToHaveTotalGroups" INTEGER,
ADD COLUMN "niceToHaveMatchedValues" INTEGER;

ALTER TABLE "MatchAction"
DROP COLUMN "matchTier",
ADD COLUMN "resolvedMatchMode" "ResolvedMatchMode",
ADD COLUMN "matchedFrameworks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "matchedRoles" "CollaborationRole"[] NOT NULL DEFAULT ARRAY[]::"CollaborationRole"[],
ADD COLUMN "matchedDsaGoals" "DsaGoal"[] NOT NULL DEFAULT ARRAY[]::"DsaGoal"[],
ADD COLUMN "matchedContributionTypes" "OpenSourceContributionType"[] NOT NULL DEFAULT ARRAY[]::"OpenSourceContributionType"[],
ADD COLUMN "matchedRepositoryTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "niceToHaveMatchedGroups" INTEGER,
ADD COLUMN "niceToHaveTotalGroups" INTEGER,
ADD COLUMN "niceToHaveMatchedValues" INTEGER;

DROP TYPE "MatchTier";
