// src/services/kafka/producer.ts
import { publish, TOPICS } from "@devmatch/kafka";
import type { ConnectionContext } from "db/client";

/**
 * Broadcasts a mutual match so the Chat Service can create a room.
 */
export async function publishMatchAccepted(
    matchId: string,
    userAId: string,
    userBId: string,
    connectionContext: ConnectionContext,
    similarityScore: number
) {
    try {
        await publish(TOPICS.MATCH_ACCEPTED, {
            matchId,
            userAId,
            userBId,
            connectionContext,
            similarityScore,
            timestamp: new Date().toISOString()
        });
        console.log(`[Kafka] Published MATCH_ACCEPTED for Match ${matchId}`);
    } catch (error) {
        // We log but do not crash the request. A robust system will have an outbox pattern 
        // or a retry mechanism for guaranteed delivery if Kafka is temporarily down.
        console.error(`[Kafka] Failed to publish MATCH_ACCEPTED for ${matchId}:`, error);
    }
}

/**
 * Broadcasts a rejection for the ML Service to ingest as negative training data.
 */
export async function publishMatchRejected(
    actorId: string,
    targetId: string,
    connectionContext: ConnectionContext
) {
    try {
        await publish(TOPICS.MATCH_REJECTED, {
            actorId,
            targetId,
            connectionContext,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[Kafka] Failed to publish MATCH_REJECTED:`, error);
    }
}
