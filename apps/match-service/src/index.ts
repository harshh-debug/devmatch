import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { matchRoutes } from "./routes/match.routes";
import { warmVectorCache } from "./services/cache/vectorCache";
import { startKafkaConsumers } from "./services/kafka/consumer";
import { createTopicsIfNotExist } from "@devmatch/kafka";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Health check endpoint (for Docker/Kubernetes)
app.get("/health", (req, res) => res.status(200).json({ status: "OK", service: "match-service" }));

// Register Match Routes
app.use("/match", matchRoutes);

/**
 * Boot Sequence:
 * 1. Warm the Redis Cache from PostgreSQL
 * 2. Start Kafka Consumers to listen for real-time updates
 * 3. Start the Express server to accept HTTP traffic
 */
async function bootstrap() {
    try {
        console.log("🚀 Starting Match Service Boot Sequence...");
        
        await warmVectorCache();
        await createTopicsIfNotExist();
        await startKafkaConsumers();

        app.listen(PORT, () => {
            console.log(`✅ Match Service is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Fatal setup error during boot sequence:", error);
        process.exit(1);
    }
}

bootstrap();