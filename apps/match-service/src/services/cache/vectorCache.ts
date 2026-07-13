import { redisClient } from "./redis";
import type { MatchProfile, IntentType } from "../engine/types";
import prismaClient from "db/client";

const PROFILES_HASH = "match_profiles";
const SEEN_KEY = (userId: string, intent: string) =>
	`seen:${userId}:${intent}`;
/**
 * Warms the Redis cache on service startup.
 * Pulls all valid, complete profiles from PostgreSQL.
 */
export async function warmVectorCache(): Promise<void> {
	console.log("[Cache] Starting vector cache warm-up...");

	const profiles = await prismaClient.profile.findMany({
		where: {
			profileScore: { gte: 30 }, // Exclude empty/incomplete profiles
			skillVector: { isEmpty: false },
		},
		include: {
			user: {
				include: {
					intents: {
						where: { active: true },
					},
				},
			},
		},
	});

	if (profiles.length === 0) {
		console.log("[Cache] No valid profiles found for warm-up.");
		return;
	}

	const pipeline = redisClient.pipeline();

	// Clear the existing hash to prevent stale data from deleted accounts
	pipeline.del(PROFILES_HASH);

	let warmedCount = 0;

	for (const p of profiles) {
		// Skip users with no active intents—they aren't looking for matches
		if (p.user.intents.length === 0) continue;
		// Prevent zero-magnitude vectors from entering cache
		if (p.skillVector.every((v) => v === 0)) continue;

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

		pipeline.hset(PROFILES_HASH, p.userId, JSON.stringify(matchProfile));
		warmedCount++;
	}

	await pipeline.exec();
	console.log(
		`[Cache] Successfully warmed ${warmedCount} profiles into Redis.`,
	);
}

/**
 * Fetches ALL profiles for the matching engine.
 * Falls back to PostgreSQL if Redis is down.
 */
export async function getAllMatchProfiles(): Promise<MatchProfile[]> {
	try {
		const rawProfiles = await redisClient.hvals(PROFILES_HASH);
		return rawProfiles.map((p) => JSON.parse(p));
	} catch (error) {
		console.error(
			"[Cache] Redis HVALS failed, falling back to PostgreSQL:",
			error,
		);

		// CIRCUIT BREAKER: PostgreSQL Fallback
		const dbProfiles = await prismaClient.profile.findMany({
			where: { profileScore: { gte: 30 }, skillVector: { isEmpty: false } },
			include: { user: { include: { intents: { where: { active: true } } } } },
		});

		return dbProfiles
			.filter((p) => p.user.intents.length > 0)
			.filter((p) => !p.skillVector.every((v) => v === 0))
			.map((p) => ({
				userId: p.userId,
				username: p.user.username,
				displayName: p.user.displayName,
				avatarUrl: p.user.avatarUrl,
				college: p.user.college,
				skillTags: p.skillTags,
				lcRating: p.lcRating,
				skillVector: p.skillVector,
				activeIntents: p.user.intents.map((i) => i.intentType as IntentType),
				availability: p.user.availability,
				cfRating: p.cfRating,
				profileScore: p.profileScore,
			}));
	}
}

/**
 * Used by the Kafka consumer to seamlessly update a single user in the cache.
 */
export async function setSingleMatchProfile(
	profile: MatchProfile,
): Promise<void> {
	if (
		profile.profileScore < 30 ||
		profile.skillVector.every((v) => v === 0) ||
		profile.activeIntents.length === 0
	) {
		await redisClient.hdel(PROFILES_HASH, profile.userId);
		return;
	}

	await redisClient.hset(
		PROFILES_HASH,
		profile.userId,
		JSON.stringify(profile),
	);
}

/**
 * Marks a candidate as "seen" (Accepted or Rejected) for a specific user.
 * TTL is 7 days, so unseen pools organically refresh over time.
 */
export async function markAsSeen(
	actorId: string,
	targetId: string,
	intent: IntentType,
): Promise<void> {
	const key = SEEN_KEY(actorId, intent);
	const allKey = SEEN_KEY(actorId, "ALL");
	await redisClient.sadd(key, targetId);
	await redisClient.sadd(allKey, targetId);
	await redisClient.expire(key, 7 * 24 * 60 * 60); // 7 Days
	await redisClient.expire(allKey, 7 * 24 * 60 * 60);
}

/**
 * Retrieves the Set of userIds that the requester has already swiped on.
 */
export async function getSeenIds(
	userId: string,
	intent: string,
): Promise<Set<string>> {
	try {
		const seenArray = await redisClient.smembers(SEEN_KEY(userId, intent));
		return new Set(seenArray);
	} catch (error) {
		console.error(`[Cache] Failed to fetch seen IDs for ${userId}:`, error);
		return new Set(); // Fail open: allow matches if Redis fails, better than breaking
	}
}
