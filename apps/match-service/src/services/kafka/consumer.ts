import { subscribe, TOPICS } from "@devmatch/kafka";
import prismaClient from "db/client";
import { setSingleMatchProfile } from "../cache/vectorCache";
import { redisClient } from "../cache/redis";
import type { MatchProfile, IntentType } from "../engine/types";

const PROFILES_HASH = "match_profiles";

/**
 * Reconstructs a user's MatchProfile from the database and updates Redis.
 * This guarantees the cache has 100% accurate, non-fragmented data.
 */
async function syncUserCache(userId: string) {
	console.log(
		`\n🔔 [Kafka Consumer] DOORBELL RANG! Received event for user: ${userId}`,
	);
	try {
		const p = await prismaClient.profile.findUnique({
			where: { userId },
			include: {
				user: {
					include: { intents: { where: { active: true } } },
				},
			},
		});

		// 1. Eviction: User deleted profile, turned off all intents, or has incomplete data
		if (
			!p ||
			p.user.intents.length === 0 ||
			p.profileScore < 30 ||
			p.skillVector.every((v) => v === 0)
		) {
			await redisClient.hdel(PROFILES_HASH, userId);
			console.log(`[Cache] Evicted user ${userId} (Incomplete or inactive)`);
			return;
		}

		// 2. Update: User is fully active and valid
		const activeIntents = p.user.intents.map((i) => i.intentType as IntentType);

		const matchProfile: MatchProfile = {
			userId: p.userId,
			username: p.user.username,
			displayName: p.user.displayName,
			avatarUrl: p.user.avatarUrl,
			college: p.user.college,
			skillTags: p.skillTags,
			lcRating: p.lcRating,
			skillVector: p.skillVector,
			activeIntents: activeIntents,
			availability: p.user.availability,
			cfRating: p.cfRating,
			profileScore: p.profileScore,
		};

		await setSingleMatchProfile(matchProfile);
		console.log(`[Cache] Synchronized profile for user ${userId}`);
	} catch (error) {
		console.error(
			`[Kafka Consumer] Failed to sync cache for user ${userId}:`,
			error,
		);
	}
}

/**
 * Initializes the consumers on service boot.
 */
export async function startKafkaConsumers() {
	console.log("[Kafka] Starting consumers...");

	// Listen to Profile Parser updates
	await subscribe<{ userId: string }>(
		[TOPICS.PROFILE_UPDATED, TOPICS.USER_UPDATED],
		"match-service-group",
		async (topic, payload) => {
			// payload is already parsed and typed as { userId: string }!
			console.log(
				`\n🔔 [Kafka] Doorbell rang on [${topic}] for user: ${payload.userId}`,
			);
			await syncUserCache(payload.userId);
		},
	);
}
