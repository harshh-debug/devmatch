import { publish, TOPICS } from "@devmatch/kafka";

async function fire() {
    const userId = process.argv[2]; 
    if (!userId) {
        console.error("❌ Please provide a user ID as an argument.");
        process.exit(1);
    }

    console.log(`🔔 Firing fake profile update for user: ${userId}...`);
    await publish(TOPICS.PROFILE_UPDATED, { userId });
    
    // Give Kafka 1 second to flush the message before exiting
    setTimeout(() => process.exit(0), 1000); 
}

fire();