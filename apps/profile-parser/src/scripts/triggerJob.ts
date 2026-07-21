import "dotenv/config";
import { enqueueProfileSync } from "@devmatch/bullmq";

async function run() {
    const userId = process.argv[2]; 
    const platform = process.argv[3] as "github" | "leetcode" | "codeforces";
    const handle = process.argv[4];

    if (!userId || !platform || !handle) {
        console.log("Usage: bun run triggerJob.ts <userId> <platform> <handle>");
        process.exit(1);
    }

    console.log(`Dropping ${platform} sync job for ${handle} into Redis...`);

    await enqueueProfileSync({
        userId,
        handle,
        platform
    });

    console.log("✅ Job added! Check your worker logs.");
    process.exit(0);
}

run();
