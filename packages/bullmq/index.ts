import { Queue } from 'bullmq';

const configuredRedisUrl = process.env.REDIS_URL?.trim();
if (process.env.NODE_ENV === 'production' && !configuredRedisUrl) {
  throw new Error('REDIS_URL is required in production');
}

const connection = {
  url: configuredRedisUrl || 'redis://localhost:6379',
};

// 1. Explicitly type the supported platforms
export type SyncPlatform = 'github' | 'leetcode' | 'codeforces';

// 2. Shape of the payload that every job must conform to
export interface SyncJobPayload {
  userId: string;
  handle: string;
  platform: SyncPlatform; 
}

export const QUEUES = {
  PROFILE_SYNC: 'profile-sync-queue',
} as const;

export const profileSyncQueue = new Queue<SyncJobPayload>(QUEUES.PROFILE_SYNC, { 
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
    }
});

/**
 * Queue at most one in-flight sync for a user/platform pair. Completed and
 * permanently failed jobs are removed so a later manual or stale refresh can
 * be scheduled with the same id.
 */
export async function enqueueProfileSync(payload: SyncJobPayload) {
  return profileSyncQueue.add(payload.platform, payload, {
    jobId: `profile-sync-${payload.userId}-${payload.platform}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}

export * from 'bullmq';
