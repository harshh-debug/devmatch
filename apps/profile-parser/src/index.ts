import "dotenv/config";
import { getProducer } from "@devmatch/kafka"; // <-- Updated import
import { profileSyncWorker } from "./queue/worker";


async function bootstrap() {
    console.log("Starting Profile Parser Worker...");

    try {
        // Pre-warm the Kafka connection using your singleton
        await getProducer();
        console.log("✅ Kafka Producer connected");

        console.log("✅ BullMQ Worker listening on queue: profile-sync-queue");

    } catch (error) {
        console.error("❌ Failed to start Profile Parser:", error);
        process.exit(1);
    }
}

// Graceful Shutdown
process.on("SIGINT", async () => {
    console.log("Shutting down Profile Parser...");
    await profileSyncWorker.close();
    // (Optional: you can add a disconnect() to your kafka package later if you want strict cleanup, 
    // but for the MVP, the process exiting handles it fine).
    process.exit(0);
});

bootstrap();