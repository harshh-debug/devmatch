import prismaClient from "db/client";
import {
  SKILL_VECTOR_DIMENSIONS,
  SKILL_VECTOR_VERSION,
  classifyCanonicalSkills,
  deriveRoleEvidence,
  evaluateConfigurationCompleteness,
  normalizeRepositoryTopics,
  type CapabilityEvidence,
  type IntentConfiguration,
  type IntentConfigurationInput,
  type IntentType,
  type VerifiedCapabilities,
} from "@devmatch/shared";
import { redisClient } from "./redis";
import type { MatchProfile } from "../engine/types";

const PROFILES_HASH = "match_profiles";
const GLOBAL_EXCLUSION_KEY = (userId: string) => `match-excluded:${userId}`;
const PROFILE_QUALITY_FLOOR = 20;

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

function rowToInput(row: DbUser["intentConfigurations"][number]): IntentConfigurationInput {
  if (row.intentType === "DSA") {
    return {
      intentType: "DSA",
      offer: { languages: row.offeredLanguages, goals: row.offeredDsaGoals },
      search: {
        requiredLanguages: row.requiredLanguages,
        requiredGoals: row.requiredDsaGoals,
        niceToHaveLanguages: row.niceToHaveLanguages,
        niceToHaveGoals: row.niceToHaveDsaGoals,
        providerPreference: row.dsaProviderPreference ?? "EITHER",
        ...(row.codeforcesRatingMin !== null ? { codeforcesRatingMin: row.codeforcesRatingMin } : {}),
        ...(row.codeforcesRatingMax !== null ? { codeforcesRatingMax: row.codeforcesRatingMax } : {}),
        ...(row.leetcodeGlobalRankBest !== null ? { leetcodeGlobalRankBest: row.leetcodeGlobalRankBest } : {}),
        ...(row.leetcodeGlobalRankWorst !== null ? { leetcodeGlobalRankWorst: row.leetcodeGlobalRankWorst } : {}),
      },
    };
  }
  if (row.intentType === "PROJECT" || row.intentType === "HACKATHON") {
    return {
      intentType: row.intentType,
      offer: {
        roles: row.offeredRoles,
        languages: row.offeredLanguages,
        frameworks: row.offeredFrameworks,
        domains: row.offeredDomains,
      },
      search: {
        collaborationMode: row.collaborationMode ?? "EITHER",
        requiredRoles: row.requiredRoles,
        requiredLanguages: row.requiredLanguages,
        requiredFrameworks: row.requiredFrameworks,
        requiredDomains: row.requiredDomains,
        niceToHaveRoles: row.niceToHaveRoles,
        niceToHaveLanguages: row.niceToHaveLanguages,
        niceToHaveFrameworks: row.niceToHaveFrameworks,
        niceToHaveDomains: row.niceToHaveDomains,
      },
    };
  }
  return {
    intentType: "OPENSOURCE",
    offer: {
      languages: row.offeredLanguages,
      frameworks: row.offeredFrameworks,
      domains: row.offeredDomains,
      repositoryTopics: row.offeredRepositoryTopics,
      contributionTypes: row.offeredContributionTypes,
    },
    search: {
      requiredLanguages: row.requiredLanguages,
      requiredFrameworks: row.requiredFrameworks,
      requiredDomains: row.requiredDomains,
      requiredRepositoryTopics: row.requiredRepositoryTopics,
      requiredContributionTypes: row.requiredContributionTypes,
      niceToHaveLanguages: row.niceToHaveLanguages,
      niceToHaveFrameworks: row.niceToHaveFrameworks,
      niceToHaveDomains: row.niceToHaveDomains,
      niceToHaveRepositoryTopics: row.niceToHaveRepositoryTopics,
      niceToHaveContributionTypes: row.niceToHaveContributionTypes,
    },
  };
}

function toConfiguration(
  row: DbUser["intentConfigurations"][number],
  verifiedCapabilities: VerifiedCapabilities,
  githubUsable: boolean,
): IntentConfiguration {
  const input = rowToInput(row);
  const evidence: CapabilityEvidence[] = [];
  const addEvidence = (
    category: CapabilityEvidence["category"],
    selected: readonly string[],
    verified: readonly string[],
  ) => {
    const verifiedSet = new Set(verified);
    for (const value of selected) {
      evidence.push({
        category,
        value,
        source: verifiedSet.has(value) ? "VERIFIED" : "SELF_REPORTED",
      });
    }
  };
  if (input.intentType === "PROJECT" || input.intentType === "HACKATHON") {
    evidence.push(...deriveRoleEvidence(input.offer.roles, verifiedCapabilities));
  }
  if (input.intentType !== "DSA") {
    addEvidence("LANGUAGE", input.offer.languages, verifiedCapabilities.languages);
    addEvidence("FRAMEWORK", input.offer.frameworks, verifiedCapabilities.frameworks);
    addEvidence("DOMAIN", input.offer.domains, verifiedCapabilities.domains);
    if (input.intentType === "OPENSOURCE") {
      addEvidence("TOPIC", input.offer.repositoryTopics, verifiedCapabilities.repositoryTopics);
    }
  }
  return {
    ...input,
    completeness: evaluateConfigurationCompleteness(input, {
      githubUsable,
      verifiedCapabilities,
    }),
    metadata: {
      availableVerifiedCapabilities: verifiedCapabilities,
      offerEvidence: evidence,
    },
    updatedAt: row.updatedAt.toISOString(),
  } as IntentConfiguration;
}

function toMatchProfile(user: DbUser): MatchProfile | null {
  const profile = user.profile;
  if (!profile) return null;

  const calendar = parseContributionCalendar(profile.githubContributions);
  const githubSource = classifyCanonicalSkills([
    ...profile.topLanguages,
    ...profile.githubTopics,
  ]);
  const connected = Boolean(profile.githubUsername);
  const lastSyncedAt = profile.githubLastSyncedAt?.toISOString() ?? null;
  const usable = connected && Boolean(lastSyncedAt) &&
    (githubSource.all.length > 0 || calendar.hasCalendar);
  const verifiedCapabilities: VerifiedCapabilities = {
    languages: githubSource.languages,
    frameworks: githubSource.frameworks,
    domains: githubSource.domains,
    repositoryTopics: normalizeRepositoryTopics(profile.githubTopics),
  };
  const intentConfigurations = Object.fromEntries(
    user.intentConfigurations.map((row) => [
      row.intentType,
      toConfiguration(row, verifiedCapabilities, usable),
    ]),
  ) as Partial<Record<IntentType, IntentConfiguration>>;
  const searchIntent = user.searchIntent
    ? intentConfigurations[user.searchIntent.intentType] ?? null
    : null;
  const openToIntents = [...new Set(user.openToIntents.map((intent) => intent.intentType as IntentType))];
  const effectiveOpenToIntents = [...new Set([
    ...openToIntents,
    ...(user.searchIntent ? [user.searchIntent.intentType as IntentType] : []),
  ])].filter((intentType) => intentConfigurations[intentType]?.completeness.offerComplete);

  if (
    profile.profileScore < PROFILE_QUALITY_FLOOR ||
    profile.skillVector.length !== SKILL_VECTOR_DIMENSIONS ||
    profile.skillVector.every((value) => value === 0)
  ) {
    return null;
  }

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
    intentConfigurations,
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
      intentConfigurations: { orderBy: { intentType: "asc" } },
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
    !profile.skillVector.every((value) => value === 0);
  if (!valid) {
    await redisClient.hdel(PROFILES_HASH, profile.userId);
    return;
  }
  await redisClient.hset(PROFILES_HASH, profile.userId, JSON.stringify(profile));
}

/** Global, symmetric seven-day rejection exclusion. Connections and pending
 * requests are enforced durably through ConnectionPair; this Redis set is only
 * the requested short-lived rejection cooldown. */
export async function markRejectedGlobally(actorId: string, targetId: string) {
  await Promise.all([
    redisClient.sadd(GLOBAL_EXCLUSION_KEY(actorId), targetId),
    redisClient.sadd(GLOBAL_EXCLUSION_KEY(targetId), actorId),
    redisClient.expire(GLOBAL_EXCLUSION_KEY(actorId), 7 * 24 * 60 * 60),
    redisClient.expire(GLOBAL_EXCLUSION_KEY(targetId), 7 * 24 * 60 * 60),
  ]);
}

export async function getGlobalExcludedIds(userId: string): Promise<Set<string>> {
  try {
    return new Set(await redisClient.smembers(GLOBAL_EXCLUSION_KEY(userId)));
  } catch (error) {
    console.error(`[Cache] Failed to fetch global exclusions for ${userId}`, error);
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
