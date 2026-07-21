import prismaClient from "db/client";
import { enqueueProfileSync, type SyncJobPayload } from "@devmatch/bullmq";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function isStale(lastSyncedAt: Date | null, now: Date) {
  return !lastSyncedAt || lastSyncedAt.getTime() <= now.getTime() - STALE_AFTER_MS;
}

/**
 * Queue refreshes for linked accounts whose last successful platform-specific
 * sync is at least 24 hours old. This function intentionally handles errors
 * so an unavailable Redis instance never prevents a user from logging in.
 */
export async function enqueueStaleProfileSyncs(userId: string) {
  try {
    const profile = await prismaClient.profile.findUnique({
      where: { userId },
      select: {
        githubUsername: true,
        leetcodeHandle: true,
        codeforcesHandle: true,
        githubLastSyncedAt: true,
        leetcodeLastSyncedAt: true,
        codeforcesLastSyncedAt: true,
      },
    });
    if (!profile) return;

    const now = new Date();
    const jobs: SyncJobPayload[] = [];
    if (profile.githubUsername && isStale(profile.githubLastSyncedAt, now)) {
      jobs.push({ userId, handle: profile.githubUsername, platform: "github" });
    }
    if (profile.leetcodeHandle && isStale(profile.leetcodeLastSyncedAt, now)) {
      jobs.push({ userId, handle: profile.leetcodeHandle, platform: "leetcode" });
    }
    if (profile.codeforcesHandle && isStale(profile.codeforcesLastSyncedAt, now)) {
      jobs.push({ userId, handle: profile.codeforcesHandle, platform: "codeforces" });
    }

    await Promise.all(jobs.map(enqueueProfileSync));
  } catch (error) {
    console.error("[Profile Sync] Could not queue stale profile refreshes", { userId, error });
  }
}

/** Start the best-effort refresh without holding up authentication. */
export function scheduleStaleProfileSyncs(userId: string) {
  void enqueueStaleProfileSyncs(userId);
}
