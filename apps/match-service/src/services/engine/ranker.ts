import {
  SKILL_LANGUAGE_INDICES,
  SKILL_TECHNICAL_INDICES,
  SKILL_VECTOR_DIMENSIONS,
  SKILL_VECTOR_VERSION,
  buildSkillVector,
  classifyCanonicalSkills,
  projectSkillVector,
} from "@devmatch/shared";
import {
  getAllMatchProfiles,
  getMatchProfile,
  getSeenIds,
  reconstructMatchProfile,
} from "../cache/vectorCache";
import { calculateCosineSimilarity } from "./cosine";
import type {
  CandidateResult,
  Compatibility,
  IntentType,
  LevelSource,
  MatchProfile,
  MatchTier,
  RecommendationSnapshot,
} from "./types";

const TECHNICAL_FLOOR = 0.2;
const PROFILE_QUALITY_FLOOR = 30;
const compatibilityRank: Record<Compatibility, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  UNKNOWN: 3,
};

export class MatchEngineError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value)).sort();
}

function levelBand(compatibility: Compatibility): CandidateResult["levelBand"] {
  if (compatibility === "HIGH") return "NEAR";
  if (compatibility === "MEDIUM") return "MID";
  if (compatibility === "LOW") return "FAR";
  return "UNKNOWN";
}

function validProfile(profile: MatchProfile) {
  return profile.profileScore >= PROFILE_QUALITY_FLOOR &&
    profile.vectorVersion === SKILL_VECTOR_VERSION &&
    profile.skillVector.length === SKILL_VECTOR_DIMENSIONS &&
    !profile.skillVector.every((value) => value === 0);
}

function worseCompatibility(left: Compatibility, right: Compatibility): Compatibility {
  return compatibilityRank[left]! >= compatibilityRank[right]! ? left : right;
}

function codeforcesCompatibility(left: number, right: number): Compatibility {
  const difference = Math.abs(left - right);
  if (difference <= 200) return "HIGH";
  if (difference <= 500) return "MEDIUM";
  return "LOW";
}

function leetcodeCompatibility(left: number, right: number): Compatibility {
  const ratio = Math.max(left, right) / Math.min(left, right);
  if (ratio <= 2) return "HIGH";
  if (ratio <= 5) return "MEDIUM";
  return "LOW";
}

function dsaCompatibility(
  requester: MatchProfile,
  candidate: MatchProfile,
): { compatibility: Compatibility; levelSource: LevelSource } {
  const hasCf = requester.cfRating !== null && candidate.cfRating !== null;
  const hasLc = requester.lcRating !== null && candidate.lcRating !== null &&
    requester.lcRating > 0 && candidate.lcRating > 0;
  if (hasCf && hasLc) {
    return {
      compatibility: worseCompatibility(
        codeforcesCompatibility(requester.cfRating!, candidate.cfRating!),
        leetcodeCompatibility(requester.lcRating!, candidate.lcRating!),
      ),
      levelSource: "MIXED_CP",
    };
  }
  if (hasCf) {
    return {
      compatibility: codeforcesCompatibility(requester.cfRating!, candidate.cfRating!),
      levelSource: "CODEFORCES",
    };
  }
  if (hasLc) {
    return {
      compatibility: leetcodeCompatibility(requester.lcRating!, candidate.lcRating!),
      levelSource: "LEETCODE",
    };
  }
  return { compatibility: "UNKNOWN", levelSource: "UNKNOWN" };
}

function indicatorTier(value: number, boundaries: [number, number, number]) {
  if (value < boundaries[0]) return 0;
  if (value < boundaries[1]) return 1;
  if (value < boundaries[2]) return 2;
  return 3;
}

function githubExperienceTier(profile: MatchProfile): number | null {
  const indicators: number[] = [];
  if (profile.github.contributionsLastYear !== null) {
    indicators.push(indicatorTier(profile.github.contributionsLastYear, [50, 200, 500]));
  }
  if (profile.github.activeWeeksLastYear !== null) {
    indicators.push(indicatorTier(profile.github.activeWeeksLastYear, [8, 26, 40]));
  }
  if (profile.github.stars !== null) {
    const stars = profile.github.stars;
    indicators.push(stars === 0 ? 0 : stars < 10 ? 1 : stars < 100 ? 2 : 3);
  }
  if (indicators.length < 2) return null;
  indicators.sort((a, b) => a - b);
  const middle = (indicators.length - 1) / 2;
  return Math.round((indicators[Math.floor(middle)]! + indicators[Math.ceil(middle)]!) / 2);
}

function githubCompatibility(
  requester: MatchProfile,
  candidate: MatchProfile,
): { compatibility: Compatibility; levelSource: LevelSource } {
  if (!requester.github.usable || !candidate.github.usable) {
    return { compatibility: "UNKNOWN", levelSource: "UNKNOWN" };
  }
  const requesterTier = githubExperienceTier(requester);
  const candidateTier = githubExperienceTier(candidate);
  if (requesterTier === null || candidateTier === null) {
    return { compatibility: "UNKNOWN", levelSource: "UNKNOWN" };
  }
  const distance = Math.abs(requesterTier - candidateTier);
  return {
    compatibility: distance === 0 ? "HIGH" : distance === 1 ? "MEDIUM" : "LOW",
    levelSource: "GITHUB",
  };
}

function sourceFeatures(profile: MatchProfile, intentType: IntentType) {
  if (intentType === "OPENSOURCE") {
    return classifyCanonicalSkills([...profile.topLanguages, ...profile.github.topics]);
  }
  return classifyCanonicalSkills(profile.skillTags);
}

function technicalProjection(profile: MatchProfile, intentType: IntentType) {
  if (intentType === "OPENSOURCE") {
    const sourceVector = buildSkillVector({
      skillTags: [...profile.topLanguages, ...profile.github.topics],
    });
    return projectSkillVector(sourceVector, SKILL_TECHNICAL_INDICES);
  }
  return projectSkillVector(
    profile.skillVector,
    intentType === "DSA" ? SKILL_LANGUAGE_INDICES : SKILL_TECHNICAL_INDICES,
  );
}

function preferencesMatch(
  requester: MatchProfile,
  candidateFeatures: ReturnType<typeof sourceFeatures>,
) {
  const preferences = requester.searchIntent;
  if (!preferences) return false;
  const languageMatch = preferences.preferredLanguages.length === 0 ||
    intersection(preferences.preferredLanguages, candidateFeatures.languages).length > 0;
  const domainMatch = preferences.preferredDomains.length === 0 ||
    intersection(preferences.preferredDomains, candidateFeatures.domains).length > 0;
  return languageMatch && domainMatch;
}

export function evaluateRecommendation(
  requester: MatchProfile,
  candidate: MatchProfile,
  intentType: IntentType,
): { snapshot: RecommendationSnapshot; preferencesMatched: boolean } | null {
  if (!validProfile(requester) || !validProfile(candidate)) return null;
  if (!candidate.effectiveOpenToIntents.includes(intentType)) return null;
  if (candidate.availability === "BUSY") return null;
  if (intentType === "OPENSOURCE" && (!requester.github.usable || !candidate.github.usable)) {
    return null;
  }

  const requesterFeatures = sourceFeatures(requester, intentType);
  const candidateFeatures = sourceFeatures(candidate, intentType);
  const matchedLanguages = intersection(requesterFeatures.languages, candidateFeatures.languages);
  const matchedDomains = intentType === "DSA"
    ? []
    : intersection(requesterFeatures.domains, candidateFeatures.domains);
  const matchedFrameworks = intentType === "DSA"
    ? []
    : intersection(requesterFeatures.frameworks, candidateFeatures.frameworks);
  const matchedSkills = [...new Set([
    ...matchedLanguages,
    ...matchedFrameworks,
    ...matchedDomains,
  ])].sort();
  if (matchedSkills.length === 0) return null;

  const similarityScore = calculateCosineSimilarity(
    technicalProjection(requester, intentType),
    technicalProjection(candidate, intentType),
  );
  if (!Number.isFinite(similarityScore) || similarityScore < TECHNICAL_FLOOR) return null;

  const preferences = requester.searchIntent;
  if (
    intentType === "DSA" &&
    preferences &&
    (preferences.ratingMin !== undefined || preferences.ratingMax !== undefined)
  ) {
    if (candidate.cfRating === null) return null;
    if (preferences.ratingMin !== undefined && candidate.cfRating < preferences.ratingMin) return null;
    if (preferences.ratingMax !== undefined && candidate.cfRating > preferences.ratingMax) return null;
  }

  const level = intentType === "DSA"
    ? dsaCompatibility(requester, candidate)
    : githubCompatibility(requester, candidate);
  const preferencesMatched = preferencesMatch(requester, candidateFeatures);
  const matchTier: MatchTier = preferencesMatched ? "STRICT" : "RELAXED_PREFERENCES";

  return {
    preferencesMatched,
    snapshot: {
      similarityScore,
      compatibility: level.compatibility,
      levelSource: level.levelSource,
      matchedSkills,
      matchedLanguages,
      matchedDomains,
      matchTier,
      explanation: {
        intentType,
        compatibility: level.compatibility,
        levelSource: level.levelSource,
        matchTier,
      },
    },
  };
}

export function compareCandidateResults(left: CandidateResult, right: CandidateResult) {
  return compatibilityRank[left.compatibility]! - compatibilityRank[right.compatibility]! ||
    right.similarityScore - left.similarityScore ||
    right.profileScore - left.profileScore ||
    left.userId.localeCompare(right.userId);
}

async function authoritativeRequester(requesterId: string, intentRevision?: number) {
  let requester = await getMatchProfile(requesterId);
  if (
    !requester ||
    intentRevision === undefined ||
    requester.matchPreferencesRevision !== intentRevision
  ) {
    requester = await reconstructMatchProfile(requesterId);
  }
  if (!requester?.searchIntent) {
    throw new MatchEngineError(409, "SEARCH_INTENT_REQUIRED", "Set a search intent before discovering candidates.");
  }
  return requester;
}

export interface RankerResponse {
  candidates: CandidateResult[];
  relaxedStartIndex?: number;
  relaxed: boolean;
  totalAvailable: number;
}

async function rankCandidates(
  requesterId: string,
  page: number,
  limit: number,
  intentRevision: number | undefined,
  explore: boolean,
): Promise<RankerResponse> {
  const requester = await authoritativeRequester(requesterId, intentRevision);
  const intentType = requester.searchIntent!.intentType;
  const [allProfiles, seenIds] = await Promise.all([
    getAllMatchProfiles(),
    getSeenIds(requesterId, intentType),
  ]);

  const strict: CandidateResult[] = [];
  const relaxed: CandidateResult[] = [];
  for (const candidate of allProfiles) {
    if (candidate.userId === requesterId || seenIds.has(candidate.userId)) continue;
    const evaluated = evaluateRecommendation(requester, candidate, intentType);
    if (!evaluated) continue;
    const result: CandidateResult = {
      ...candidate,
      ...evaluated.snapshot,
      levelBand: levelBand(evaluated.snapshot.compatibility),
    };
    if (evaluated.preferencesMatched) strict.push(result);
    else relaxed.push(result);
  }
  strict.sort(compareCandidateResults);
  relaxed.sort(compareCandidateResults);

  const ordered = explore
    ? [...strict, ...relaxed].sort(compareCandidateResults)
    : [...strict, ...relaxed];
  const start = (page - 1) * limit;
  return {
    candidates: ordered.slice(start, start + limit),
    relaxed: relaxed.length > 0,
    relaxedStartIndex: strict.length,
    totalAvailable: ordered.length,
  };
}

export function getRankedCandidates(
  requesterId: string,
  page = 1,
  limit = 20,
  intentRevision?: number,
) {
  return rankCandidates(requesterId, page, limit, intentRevision, false);
}

export function getSimilarCandidates(
  requesterId: string,
  page = 1,
  limit = 20,
  intentRevision?: number,
) {
  return rankCandidates(requesterId, page, limit, intentRevision, true);
}
