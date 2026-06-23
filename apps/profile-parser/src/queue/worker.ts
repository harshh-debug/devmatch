// apps/profile-parser/src/queue/worker.ts
import { Worker, type SyncJobPayload, QUEUES } from "@devmatch/bullmq";
import { profileUpdater } from "../services/profileUpdate";
import { publish, TOPICS } from "@devmatch/kafka";
import { githubProvider } from "../provider/github.provider";
import { leetcodeProvider } from "../provider/leetcode.provider";
import { codeforcesProvider } from "../provider/codeforces.provider";

const redisConnection = { url: process.env.REDIS_URL || "redis://localhost:6379" };

export const processProfileSync = async (job: { data: SyncJobPayload }) => {
    const { userId, handle, platform } = job.data;
    console.log(`[Worker] Starting ${platform} sync for ${handle}`);

    let updatedProfile;

    // Route to provider and update DB
    switch (platform) {
        case "github":
            const githubData = await githubProvider.fetchProfileData(handle);
            updatedProfile = await profileUpdater.updateGitHubStats(userId, githubData);
            break;
        
        case "leetcode":
            const lcData = await leetcodeProvider.fetchProfileData(handle);
            updatedProfile = await profileUpdater.updateLeetCodeStats(userId, lcData);
            break;

        case "codeforces":
            const cfData = await codeforcesProvider.fetchProfileData(handle);
            updatedProfile = await profileUpdater.updateCodeforcesStats(userId, cfData);
            break;
        
        default:
            throw new Error(`Unsupported platform sync: ${platform}`);
    }

    // Broadcast the update 
    await publish(TOPICS.PROFILE_UPDATED, {
        userId,
        skillVector: updatedProfile.skillVector,
        timestamp: new Date().toISOString(),
    });

    console.log(`[Worker] Sync complete. Event published for ${userId}`);
};

export const profileSyncWorker = new Worker<SyncJobPayload>(
    QUEUES.PROFILE_SYNC,
    processProfileSync, 
    { 
        connection: redisConnection,
        concurrency: 5,
        autorun: false,
        limiter: {
            max: 100, 
            duration: 60000, 
        }
    }
);