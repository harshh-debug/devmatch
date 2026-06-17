import { Queue } from 'bullmq';

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
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

export * from 'bullmq';