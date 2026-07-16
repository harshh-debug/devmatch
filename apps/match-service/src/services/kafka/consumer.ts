import { subscribe, TOPICS } from "@devmatch/kafka";
import type { MatchPreferencesUpdatedV1 } from "@devmatch/shared";
import { reconstructMatchProfile } from "../cache/vectorCache";
import { redisClient } from "../cache/redis";

const PROCESSED_EVENT_KEY = (eventId: string) => `match-event:${eventId}`;
const EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

async function syncUserCache(userId: string) {
  const profile = await reconstructMatchProfile(userId);
  console.log(profile
    ? `[Cache] Synchronized profile for ${userId}`
    : `[Cache] Evicted ineligible profile for ${userId}`);
}

export async function startKafkaConsumers() {
  console.log("[Kafka] Starting match-service consumers...");
  await subscribe<Record<string, unknown>>(
    [TOPICS.PROFILE_UPDATED, TOPICS.USER_UPDATED, TOPICS.MATCH_PREFERENCES_UPDATED],
    "match-service-group",
    async (topic, payload) => {
      if (topic === TOPICS.MATCH_PREFERENCES_UPDATED) {
        const event = payload as unknown as MatchPreferencesUpdatedV1;
        if (
          event.schemaVersion !== 1 ||
          event.eventType !== "MATCH_PREFERENCES_UPDATED" ||
          !event.eventId ||
          !event.userId
        ) {
          console.error("[Kafka] Ignoring invalid match preference event", payload);
          return;
        }
        if (await redisClient.exists(PROCESSED_EVENT_KEY(event.eventId))) return;
        await syncUserCache(event.userId);
        await redisClient.set(PROCESSED_EVENT_KEY(event.eventId), "1", "EX", EVENT_TTL_SECONDS);
        return;
      }

      const userId = typeof payload.userId === "string" ? payload.userId : null;
      if (!userId) {
        console.error(`[Kafka] Ignoring ${topic} event without userId`);
        return;
      }
      await syncUserCache(userId);
    },
  );
}
