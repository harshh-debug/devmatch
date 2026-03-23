-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('ACTIVE', 'OPEN', 'BUSY');

-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('DSA', 'HACKATHON', 'PROJECT', 'OPENSOURCE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'MATCHED', 'REJECTED', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'CODE_SNIPPET', 'LINK');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "githubId" TEXT,
    "password" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "college" TEXT,
    "bio" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "githubUsername" TEXT,
    "leetcodeHandle" TEXT,
    "codeforcesHandle" TEXT,
    "topLanguages" TEXT[],
    "skillTags" TEXT[],
    "githubStars" INTEGER NOT NULL DEFAULT 0,
    "contributionStreak" INTEGER NOT NULL DEFAULT 0,
    "lcRating" INTEGER,
    "cfRating" INTEGER,
    "skillVector" DOUBLE PRECISION[],
    "profileScore" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "MatchIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "ratingMin" INTEGER,
    "ratingMax" INTEGER,
    "preferredLanguages" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "intentType" "IntentType" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "matchedAt" TIMESTAMP(3),
    "initiatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_matchId_key" ON "ChatRoom"("matchId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchIntent" ADD CONSTRAINT "MatchIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
