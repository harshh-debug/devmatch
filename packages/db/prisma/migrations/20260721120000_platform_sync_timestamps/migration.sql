-- Track successful syncs per provider so freshness decisions do not depend on
-- an aggregate timestamp that may have been written by another platform.
ALTER TABLE "Profile"
ADD COLUMN "leetcodeLastSyncedAt" TIMESTAMP(3),
ADD COLUMN "codeforcesLastSyncedAt" TIMESTAMP(3);
