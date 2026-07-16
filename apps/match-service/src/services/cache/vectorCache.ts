import prismaClient from "db/client";
import {
  SKILL_VECTOR_DIMENSIONS,
  SKILL_VECTOR_VERSION,
  classifyCanonicalSkills,
  type IntentPreferences,
  type IntentType,
} from "@devmatch/shared";
import { redisClient } from "./redis";
import type { MatchProfile } from "../engine/types";

const PROFILES_HASH = "match_profiles";
const SEEN_KEY = (userId: string, intent: string) => `seen:${userId}:${intent}`;
const PROFILE_QUALITY_FLOOR = 30;

type DbUser = Awaited<ReturnType<typeof loadUsers>>[number];

function parseContributionCalendar(value: unknown) {
  if (!Array.isArray(value)) {
    return { contributions: null, activeWeeks: null, hasCalendar: false };
  }
  let contributions = 0;
  let activeWeeks = 0;
  let hasCalendar = false;
  for (const week of value) {
    if (!week || typeof week !== "object" || !("days" in week) || !Array.isArray(week.days)) continue;
    let weekTotal = 0;
    for (const day of week.days) {
      if (!day || typeof day !== "object" || !("count" in day)) continue;
      const count = Number(day.count);
      if (!Number.isFinite(count)) continue;
      hasCalendar = true;
      contributions += count;
      weekTotal += count;
    }
    if (weekTotal > 0) activeWeeks++;
  }
  return {
    contributions: hasCalendar ? contributions : null,
    activeWeeks: hasCalendar ? activeWeeks : null,
    hasCalendar,
  };
}

function toIntentPreferences(intent: DbUser["searchIntent"]): IntentPreferences | null {
  if (!intent) return null;
  return {
    intentType: intent.intentType,
    ...(intent.ratingMin !== null ? { ratingMin: intent.ratingMin } : {}),
    ...(intent.ratingMax !== null ? { ratingMax: intent.ratingMax } : {}),
    preferredLanguages: intent.preferredLanguages,
    preferredDomains: intent.preferredDomains,
  };
}

function toMatchProfile(user: DbUser): MatchProfile | null {
  const profile = user.profile;
  if (!profile) return null;

  const searchIntent = toIntentPreferences(user.searchIntent);
  const openToIntents = [...new Set(user.openToIntents.map((intent) => intent.intentType as IntentType))];
  const effectiveOpenToIntents = [...new Set([
    ...openToIntents,
    ...(searchIntent ? [searchIntent.intentType] : []),
  ])];

  if (
    profile.profileScore < PROFILE_QUALITY_FLOOR ||
    profile.skillVector.length !== SKILL_VECTOR_DIMENSIONS ||
    profile.skillVector.every((value) => value === 0) ||
    effectiveOpenToIntents.length === 0
  ) {
    return null;
  }

  const calendar = parseContributionCalendar(profile.githubContributions);
  const githubSource = classifyCanonicalSkills([
    ...profile.topLanguages,
    ...profile.githubTopics,
  ]);
  const connected = Boolean(profile.githubUsername);
  const lastSyncedAt = profile.githubLastSyncedAt?.toISOString() ?? null;
  const usable = connected && Boolean(lastSyncedAt) &&
    (githubSource.all.length > 0 || calendar.hasCalendar);

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    college: user.college,
    skillTags: profile.skillTags,
    topLanguages: profile.topLanguages,
    lcRating: profile.lcRating,
    cfRating: profile.cfRating,
    skillVector: profile.skillVector,
    vectorVersion: SKILL_VECTOR_VERSION,
    availability: user.availability,
    profileScore: profile.profileScore,
    matchPreferencesRevision: user.matchPreferencesRevision,
    searchIntent,
    openToIntents,
    effectiveOpenToIntents,
    github: {
      connected,
      usable,
      contributionsLastYear: calendar.contributions,
      activeWeeksLastYear: calendar.activeWeeks,
      stars: lastSyncedAt ? profile.githubStars : null,
      topics: profile.githubTopics,
      lastSyncedAt,
    },
  };
}

function loadUsers(userId?: string) {
  return prismaClient.user.findMany({
    where: userId ? { id: userId } : undefined,
    include: {
      profile: true,
      searchIntent: true,
      openToIntents: {
        select: { intentType: true },
        orderBy: { intentType: "asc" },
      },
    },
  });
}

export async function reconstructMatchProfile(userId: string): Promise<MatchProfile | null> {
  const [user] = await loadUsers(userId);
  const profile = user ? toMatchProfile(user) : null;
  if (!profile) {
    await redisClient.hdel(PROFILES_HASH, userId);
    return null;
  }
  await redisClient.hset(PROFILES_HASH, userId, JSON.stringify(profile));
  return profile;
}

export async function warmVectorCache(): Promise<void> {
  console.log("[Cache] Rebuilding match profile cache from PostgreSQL...");
  const users = await loadUsers();
  const profiles = users.map(toMatchProfile).filter((profile): profile is MatchProfile => profile !== null);
  const pipeline = redisClient.pipeline();
  pipeline.del(PROFILES_HASH);
  for (const profile of profiles) {
    pipeline.hset(PROFILES_HASH, profile.userId, JSON.stringify(profile));
  }
  await pipeline.exec();
  console.log(`[Cache] Rebuilt ${profiles.length} match profiles.`);
}

export async function getAllMatchProfiles(): Promise<MatchProfile[]> {
  try {
    const rawProfiles = await redisClient.hvals(PROFILES_HASH);
    if (rawProfiles.length > 0) {
      return rawProfiles.map((profile) => JSON.parse(profile) as MatchProfile);
    }
    const users = await loadUsers();
    const profiles = users.map(toMatchProfile).filter((profile): profile is MatchProfile => profile !== null);
    if (profiles.length > 0) {
      const pipeline = redisClient.pipeline();
      for (const profile of profiles) {
        pipeline.hset(PROFILES_HASH, profile.userId, JSON.stringify(profile));
      }
      await pipeline.exec();
    }
    return profiles;
  } catch (error) {
    console.error("[Cache] Redis unavailable; loading profiles from PostgreSQL", error);
    const users = await loadUsers();
    return users.map(toMatchProfile).filter((profile): profile is MatchProfile => profile !== null);
  }
}

export async function getMatchProfile(userId: string): Promise<MatchProfile | null> {
  try {
    const raw = await redisClient.hget(PROFILES_HASH, userId);
    return raw ? JSON.parse(raw) as MatchProfile : null;
  } catch {
    const [user] = await loadUsers(userId);
    return user ? toMatchProfile(user) : null;
  }
}

export async function setSingleMatchProfile(profile: MatchProfile): Promise<void> {
  const valid =
    profile.profileScore >= PROFILE_QUALITY_FLOOR &&
    profile.vectorVersion === SKILL_VECTOR_VERSION &&
    profile.skillVector.length === SKILL_VECTOR_DIMENSIONS &&
    !profile.skillVector.every((value) => value === 0) &&
    profile.effectiveOpenToIntents.length > 0;
  if (!valid) {
    await redisClient.hdel(PROFILES_HASH, profile.userId);
    return;
  }
  await redisClient.hset(PROFILES_HASH, profile.userId, JSON.stringify(profile));
}

export async function markAsSeen(actorId: string, targetId: string, intent: IntentType) {
  const key = SEEN_KEY(actorId, intent);
  const allKey = SEEN_KEY(actorId, "ALL");
  await redisClient.sadd(key, targetId);
  await redisClient.sadd(allKey, targetId);
  await redisClient.expire(key, 7 * 24 * 60 * 60);
  await redisClient.expire(allKey, 7 * 24 * 60 * 60);
}

export async function getSeenIds(userId: string, intent: string): Promise<Set<string>> {
  try {
    return new Set(await redisClient.smembers(SEEN_KEY(userId, intent)));
  } catch (error) {
    console.error(`[Cache] Failed to fetch seen IDs for ${userId}`, error);
    return new Set();
  }
}

export function startCacheReconciliation() {
  const timer = setInterval(() => {
    void warmVectorCache().catch((error) =>
      console.error("[Cache] Reconciliation failed", error),
    );
  }, 5 * 60 * 1_000);
  timer.unref?.();
}
