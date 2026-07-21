import {
  SKILL_VECTOR_DIMENSIONS,
  SKILL_VECTOR_VERSION,
  countNiceToHaveMatches,
  requiredGroupsMatch,
  type CapabilityEvidence,
  type CapabilityGroup,
  type IntentConfiguration,
  type NiceToHaveMatch,
  type ResolvedMatchMode,
} from "@devmatch/shared";
import {
  getAllMatchProfiles,
  getMatchProfile,
  getGlobalExcludedIds,
  reconstructMatchProfile,
} from "../cache/vectorCache";
import prismaClient from "db/client";
import { calculateCosineSimilarity } from "./cosine";
import type {
  CandidateResult,
  ExploreCandidateResult,
  Compatibility,
  IntentType,
  LevelSource,
  MatchProfile,
  RecommendationSnapshot,
} from "./types";

const PROFILE_QUALITY_FLOOR = 20;
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

function intersection<T extends string>(left: readonly T[], right: readonly T[]): T[] {
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
  return compatibilityRank[left] >= compatibilityRank[right] ? left : right;
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
    indicators.push(profile.github.stars === 0 ? 0 : profile.github.stars < 10 ? 1 : profile.github.stars < 100 ? 2 : 3);
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

function ratioScore(matched: number, total: number) {
  return total === 0 ? 0 : Math.min(1, matched / total);
}

function labeledFeatures(configuration: IntentConfiguration): string[] {
  if (configuration.intentType === "DSA") {
    return [
      ...configuration.offer.languages.map((value) => `language:${value}`),
      ...configuration.offer.goals.map((value) => `goal:${value}`),
    ];
  }
  if (configuration.intentType === "PROJECT" || configuration.intentType === "HACKATHON") {
    return [
      ...configuration.offer.roles.map((value) => `role:${value}`),
      ...configuration.offer.languages.map((value) => `language:${value}`),
      ...configuration.offer.frameworks.map((value) => `framework:${value}`),
      ...configuration.offer.domains.map((value) => `domain:${value}`),
    ];
  }
  return [
    ...configuration.offer.languages.map((value) => `language:${value}`),
    ...configuration.offer.frameworks.map((value) => `framework:${value}`),
    ...configuration.offer.domains.map((value) => `domain:${value}`),
    ...configuration.offer.repositoryTopics.map((value) => `topic:${value}`),
    ...configuration.offer.contributionTypes.map((value) => `contribution:${value}`),
  ];
}

function overlapScore(left: readonly string[], right: readonly string[]) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  return intersection(left, right).length / union.size;
}

function matchingEvidence(
  configuration: IntentConfiguration,
  values: {
    roles?: readonly string[];
    languages?: readonly string[];
    frameworks?: readonly string[];
    domains?: readonly string[];
    topics?: readonly string[];
  },
): CapabilityEvidence[] {
  const selected = new Set([
    ...(values.roles ?? []).map((value) => `ROLE:${value}`),
    ...(values.languages ?? []).map((value) => `LANGUAGE:${value}`),
    ...(values.frameworks ?? []).map((value) => `FRAMEWORK:${value}`),
    ...(values.domains ?? []).map((value) => `DOMAIN:${value}`),
    ...(values.topics ?? []).map((value) => `TOPIC:${value}`),
  ]);
  return configuration.metadata.offerEvidence.filter((evidence) =>
    selected.has(`${evidence.category}:${evidence.value}`),
  );
}

function providerMatches(
  search: Extract<IntentConfiguration, { intentType: "DSA" }>["search"],
  candidate: MatchProfile,
) {
  const cfMatches = candidate.cfRating !== null &&
    (search.codeforcesRatingMin === undefined || candidate.cfRating >= search.codeforcesRatingMin) &&
    (search.codeforcesRatingMax === undefined || candidate.cfRating <= search.codeforcesRatingMax);
  const lcMatches = candidate.lcRating !== null && candidate.lcRating > 0 &&
    (search.leetcodeGlobalRankBest === undefined || candidate.lcRating >= search.leetcodeGlobalRankBest) &&
    (search.leetcodeGlobalRankWorst === undefined || candidate.lcRating <= search.leetcodeGlobalRankWorst);
  if (search.providerPreference === "CODEFORCES") return cfMatches;
  if (search.providerPreference === "LEETCODE") return lcMatches;
  return cfMatches || lcMatches;
}

function evaluateDsa(
  requester: MatchProfile,
  candidate: MatchProfile,
  requesterConfiguration: Extract<IntentConfiguration, { intentType: "DSA" }>,
  candidateConfiguration: Extract<IntentConfiguration, { intentType: "DSA" }>,
): RecommendationSnapshot | null {
  const search = requesterConfiguration.search;
  if (!providerMatches(search, candidate)) return null;
  const groups: CapabilityGroup[] = [
    { required: search.requiredLanguages, offered: candidateConfiguration.offer.languages },
    { required: search.requiredGoals, offered: candidateConfiguration.offer.goals },
  ];
  if (!requiredGroupsMatch(groups)) return null;
  const matchedLanguages = intersection(search.requiredLanguages, candidateConfiguration.offer.languages);
  const matchedGoals = intersection(search.requiredGoals, candidateConfiguration.offer.goals);
  const niceToHave = countNiceToHaveMatches([
    { required: search.niceToHaveLanguages, offered: candidateConfiguration.offer.languages },
    { required: search.niceToHaveGoals, offered: candidateConfiguration.offer.goals },
  ]);
  const totalRequired = search.requiredLanguages.length + search.requiredGoals.length;
  const technicalFitScore = ratioScore(matchedLanguages.length + matchedGoals.length, totalRequired);
  const level = dsaCompatibility(requester, candidate);
  const reasonCodes = ["DSA_REQUIRED_CAPABILITIES_MATCHED"];
  return snapshot({
    intentType: "DSA",
    technicalFitScore,
    level,
    resolvedMatchMode: "DIRECT",
    matchedLanguages,
    matchedGoals,
    niceToHave,
    reasonCodes,
  });
}

function evaluateBuild(
  requester: MatchProfile,
  candidate: MatchProfile,
  requesterConfiguration: Extract<IntentConfiguration, { intentType: "PROJECT" | "HACKATHON" }>,
  candidateConfiguration: Extract<IntentConfiguration, { intentType: "PROJECT" | "HACKATHON" }>,
): RecommendationSnapshot | null {
  const search = requesterConfiguration.search;
  const matchedRoles = intersection(search.requiredRoles, candidateConfiguration.offer.roles);
  const matchedLanguages = intersection(search.requiredLanguages, candidateConfiguration.offer.languages);
  const matchedFrameworks = intersection(search.requiredFrameworks, candidateConfiguration.offer.frameworks);
  const matchedDomains = intersection(search.requiredDomains, candidateConfiguration.offer.domains);
  const matchedCount = matchedRoles.length + matchedLanguages.length + matchedFrameworks.length + matchedDomains.length;
  const requiredCount = search.requiredRoles.length + search.requiredLanguages.length +
    search.requiredFrameworks.length + search.requiredDomains.length;
  // Project/Hackathon discovery is domain-first. A selected domain is the one
  // hard gate; roles, languages and frameworks broaden the pool and determine
  // how highly a profile ranks. With no selected domain, any selected match is
  // enough to enter the pool.
  if (search.requiredDomains.length > 0 && matchedDomains.length === 0) return null;
  if (search.requiredDomains.length === 0 && matchedCount === 0) return null;
  const selectionFit = ratioScore(matchedCount, requiredCount);
  const similarFit = overlapScore(
    labeledFeatures(requesterConfiguration),
    labeledFeatures(candidateConfiguration),
  );
  const fillsMissing = [
    ...matchedRoles.map((value) => `role:${value}`),
    ...matchedLanguages.map((value) => `language:${value}`),
    ...matchedFrameworks.map((value) => `framework:${value}`),
    ...matchedDomains.map((value) => `domain:${value}`),
  ].some((value) => !labeledFeatures(requesterConfiguration).includes(value));

  let resolvedMatchMode: ResolvedMatchMode;
  const technicalFitScore = selectionFit;
  if (search.collaborationMode === "SIMILAR") {
    resolvedMatchMode = "SIMILAR";
  } else if (search.collaborationMode === "COMPLEMENTARY") {
    resolvedMatchMode = "COMPLEMENTARY";
  } else if (selectionFit > similarFit || (selectionFit === similarFit && fillsMissing)) {
    resolvedMatchMode = "COMPLEMENTARY";
  } else {
    resolvedMatchMode = "SIMILAR";
  }
  const level = githubCompatibility(requester, candidate);
  const reasonCodes = [
    resolvedMatchMode === "SIMILAR" ? "SIMILAR_OFFER_OVERLAP" : "COMPLEMENTARY_REQUIREMENTS_FILLED",
  ];
  return snapshot({
    intentType: requesterConfiguration.intentType,
    technicalFitScore,
    level,
    resolvedMatchMode,
    matchedRoles,
    matchedLanguages,
    matchedFrameworks,
    matchedDomains,
    niceToHave: { matchedGroupCount: 0, totalGroupCount: 0, matchedValueCount: 0 },
    reasonCodes,
    capabilityEvidence: matchingEvidence(candidateConfiguration, {
      roles: matchedRoles,
      languages: matchedLanguages,
      frameworks: matchedFrameworks,
      domains: matchedDomains,
    }),
  });
}

function evaluateOpenSource(
  requester: MatchProfile,
  candidate: MatchProfile,
  requesterConfiguration: Extract<IntentConfiguration, { intentType: "OPENSOURCE" }>,
  candidateConfiguration: Extract<IntentConfiguration, { intentType: "OPENSOURCE" }>,
): RecommendationSnapshot | null {
  if (!requester.github.usable || !candidate.github.usable) return null;
  const search = requesterConfiguration.search;
  const groups: CapabilityGroup[] = [
    { required: search.requiredLanguages, offered: candidateConfiguration.offer.languages },
    { required: search.requiredFrameworks, offered: candidateConfiguration.offer.frameworks },
    { required: search.requiredDomains, offered: candidateConfiguration.offer.domains },
    { required: search.requiredRepositoryTopics, offered: candidateConfiguration.offer.repositoryTopics },
    { required: search.requiredContributionTypes, offered: candidateConfiguration.offer.contributionTypes },
  ];
  if (!requiredGroupsMatch(groups)) return null;
  const matchedLanguages = intersection(search.requiredLanguages, candidateConfiguration.offer.languages);
  const matchedFrameworks = intersection(search.requiredFrameworks, candidateConfiguration.offer.frameworks);
  const matchedDomains = intersection(search.requiredDomains, candidateConfiguration.offer.domains);
  const matchedRepositoryTopics = intersection(search.requiredRepositoryTopics, candidateConfiguration.offer.repositoryTopics);
  const matchedContributionTypes = intersection(search.requiredContributionTypes, candidateConfiguration.offer.contributionTypes);
  const matchedCount = matchedLanguages.length + matchedFrameworks.length + matchedDomains.length +
    matchedRepositoryTopics.length + matchedContributionTypes.length;
  const requiredCount = search.requiredLanguages.length + search.requiredFrameworks.length +
    search.requiredDomains.length + search.requiredRepositoryTopics.length +
    search.requiredContributionTypes.length;
  const niceToHave = countNiceToHaveMatches([
    { required: search.niceToHaveLanguages, offered: candidateConfiguration.offer.languages },
    { required: search.niceToHaveFrameworks, offered: candidateConfiguration.offer.frameworks },
    { required: search.niceToHaveDomains, offered: candidateConfiguration.offer.domains },
    { required: search.niceToHaveRepositoryTopics, offered: candidateConfiguration.offer.repositoryTopics },
    { required: search.niceToHaveContributionTypes, offered: candidateConfiguration.offer.contributionTypes },
  ]);
  return snapshot({
    intentType: "OPENSOURCE",
    technicalFitScore: ratioScore(matchedCount, requiredCount),
    level: githubCompatibility(requester, candidate),
    resolvedMatchMode: "DIRECT",
    matchedLanguages,
    matchedFrameworks,
    matchedDomains,
    matchedRepositoryTopics,
    matchedContributionTypes,
    niceToHave,
    reasonCodes: ["GITHUB_VERIFIED_REQUIREMENTS_MATCHED"],
    capabilityEvidence: matchingEvidence(candidateConfiguration, {
      languages: matchedLanguages,
      frameworks: matchedFrameworks,
      domains: matchedDomains,
      topics: matchedRepositoryTopics,
    }),
  });
}

function snapshot(input: {
  intentType: IntentType;
  technicalFitScore: number;
  level: { compatibility: Compatibility; levelSource: LevelSource };
  resolvedMatchMode: ResolvedMatchMode;
  matchedLanguages?: string[];
  matchedFrameworks?: string[];
  matchedDomains?: string[];
  matchedRoles?: RecommendationSnapshot["matchedRoles"];
  matchedGoals?: RecommendationSnapshot["matchedGoals"];
  matchedContributionTypes?: RecommendationSnapshot["matchedContributionTypes"];
  matchedRepositoryTopics?: string[];
  niceToHave: NiceToHaveMatch;
  reasonCodes: string[];
  capabilityEvidence?: CapabilityEvidence[];
}): RecommendationSnapshot {
  const matchedLanguages = input.matchedLanguages ?? [];
  const matchedFrameworks = input.matchedFrameworks ?? [];
  const matchedDomains = input.matchedDomains ?? [];
  const matchedRoles = input.matchedRoles ?? [];
  const matchedGoals = input.matchedGoals ?? [];
  const matchedContributionTypes = input.matchedContributionTypes ?? [];
  const matchedRepositoryTopics = input.matchedRepositoryTopics ?? [];
  const matchedSkills = [...new Set([
    ...matchedLanguages,
    ...matchedFrameworks,
    ...matchedDomains,
    ...matchedRepositoryTopics,
  ])].sort();
  return {
    similarityScore: input.technicalFitScore,
    technicalFitScore: input.technicalFitScore,
    compatibility: input.level.compatibility,
    levelSource: input.level.levelSource,
    resolvedMatchMode: input.resolvedMatchMode,
    matchedSkills,
    matchedLanguages,
    matchedFrameworks,
    matchedDomains,
    matchedRoles,
    matchedGoals,
    matchedContributionTypes,
    matchedRepositoryTopics,
    niceToHave: input.niceToHave,
    capabilityEvidence: input.capabilityEvidence ?? [],
    reasonCodes: input.reasonCodes,
    explanation: {
      intentType: input.intentType,
      compatibility: input.level.compatibility,
      levelSource: input.level.levelSource,
      resolvedMatchMode: input.resolvedMatchMode,
      reasonCodes: input.reasonCodes,
      capabilityEvidence: input.capabilityEvidence ?? [],
    },
  };
}

export function evaluateRecommendation(
  requester: MatchProfile,
  candidate: MatchProfile,
  intentType: IntentType,
): { snapshot: RecommendationSnapshot } | null {
  if (!validProfile(requester) || !validProfile(candidate)) return null;
  if (!candidate.effectiveOpenToIntents.includes(intentType)) return null;
  if (candidate.availability === "BUSY") return null;
  const requesterConfiguration = requester.intentConfigurations[intentType];
  const candidateConfiguration = candidate.intentConfigurations[intentType];
  if (
    !requesterConfiguration?.completeness.offerComplete ||
    !requesterConfiguration.completeness.searchComplete ||
    !candidateConfiguration?.completeness.offerComplete
  ) {
    return null;
  }
  let evaluated: RecommendationSnapshot | null;
  if (intentType === "DSA" && requesterConfiguration.intentType === "DSA" && candidateConfiguration.intentType === "DSA") {
    evaluated = evaluateDsa(requester, candidate, requesterConfiguration, candidateConfiguration);
  } else if (
    (intentType === "PROJECT" || intentType === "HACKATHON") &&
    requesterConfiguration.intentType === intentType &&
    candidateConfiguration.intentType === intentType
  ) {
    evaluated = evaluateBuild(requester, candidate, requesterConfiguration, candidateConfiguration);
  } else if (
    intentType === "OPENSOURCE" &&
    requesterConfiguration.intentType === "OPENSOURCE" &&
    candidateConfiguration.intentType === "OPENSOURCE"
  ) {
    evaluated = evaluateOpenSource(requester, candidate, requesterConfiguration, candidateConfiguration);
  } else {
    evaluated = null;
  }
  return evaluated ? { snapshot: evaluated } : null;
}

export function compareCandidateResults(left: CandidateResult, right: CandidateResult) {
  if (left.explanation.intentType === "PROJECT" || left.explanation.intentType === "HACKATHON") {
    return right.technicalFitScore - left.technicalFitScore ||
      compatibilityRank[left.compatibility] - compatibilityRank[right.compatibility] ||
      right.profileScore - left.profileScore ||
      left.userId.localeCompare(right.userId);
  }
  return compatibilityRank[left.compatibility] - compatibilityRank[right.compatibility] ||
    right.niceToHave.matchedGroupCount - left.niceToHave.matchedGroupCount ||
    right.niceToHave.matchedValueCount - left.niceToHave.matchedValueCount ||
    right.technicalFitScore - left.technicalFitScore ||
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
  if (
    !requester.searchIntent.completeness.offerComplete ||
    !requester.searchIntent.completeness.searchComplete
  ) {
    throw new MatchEngineError(
      409,
      "INTENT_CONFIGURATION_REQUIRED",
      "Complete the active intent configuration before discovering candidates.",
    );
  }
  return requester;
}

export interface RankerResponse {
  candidates: CandidateResult[];
  totalAvailable: number;
}

export interface ExploreRankerResponse {
  candidates: ExploreCandidateResult[];
  totalAvailable: number;
}

async function pairExcludedIds(userId: string) {
  const pairs = await prismaClient.connectionPair.findMany({
    where: {
      status: { in: ["PENDING", "MATCHED"] },
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: { userAId: true, userBId: true },
  });
  return new Set(pairs.map((pair) => pair.userAId === userId ? pair.userBId : pair.userAId));
}

export function generalExperienceProximity(
  requester: MatchProfile,
  candidate: MatchProfile,
): Pick<ExploreCandidateResult, "experienceProximity" | "experienceSource"> {
  const comparisons: Pick<ExploreCandidateResult, "experienceProximity" | "experienceSource">[] = [];

  if (requester.cfRating !== null && candidate.cfRating !== null) {
    comparisons.push({
      experienceProximity: Math.max(0, 1 - Math.abs(requester.cfRating - candidate.cfRating) / 2_000),
      experienceSource: "CODEFORCES",
    });
  }
  if (requester.lcRating !== null && candidate.lcRating !== null && requester.lcRating > 0 && candidate.lcRating > 0) {
    comparisons.push({
      experienceProximity: Math.max(0, 1 - Math.abs(requester.lcRating - candidate.lcRating) / Math.max(requester.lcRating, candidate.lcRating)),
      experienceSource: "LEETCODE",
    });
  }
  const requestTier = githubExperienceTier(requester);
  const candidateTier = githubExperienceTier(candidate);
  if (requester.github.usable && candidate.github.usable && requestTier !== null && candidateTier !== null) {
    comparisons.push({
      experienceProximity: Math.max(0, 1 - Math.abs(requestTier - candidateTier) / 3),
      experienceSource: "GITHUB",
    });
  }

  // Evaluate every shared signal and surface the closest one. `>` preserves
  // the deterministic CF → LeetCode → GitHub order when scores are tied.
  return comparisons.reduce<Pick<ExploreCandidateResult, "experienceProximity" | "experienceSource">>(
    (best, comparison) => comparison.experienceProximity > best.experienceProximity ? comparison : best,
    { experienceProximity: 0, experienceSource: "UNKNOWN" },
  );
}

export function compareExploreCandidates(left: ExploreCandidateResult, right: ExploreCandidateResult) {
  return right.similarityScore - left.similarityScore ||
    right.sharedSkillCount - left.sharedSkillCount ||
    right.experienceProximity - left.experienceProximity ||
    right.profileScore - left.profileScore ||
    left.userId.localeCompare(right.userId);
}

export async function getExploreCandidates(
  requesterId: string,
  page = 1,
  limit = 20,
): Promise<ExploreRankerResponse> {
  const requester = await getMatchProfile(requesterId) ?? await reconstructMatchProfile(requesterId);
  if (!requester || !validProfile(requester) || requester.availability === "BUSY") {
    throw new MatchEngineError(409, "PROFILE_CONFIGURATION_REQUIRED", "Complete your profile before exploring developers.");
  }
  const [allProfiles, globalRejected, pairExcluded] = await Promise.all([
    getAllMatchProfiles(),
    getGlobalExcludedIds(requesterId),
    pairExcludedIds(requesterId),
  ]);
  const candidates: ExploreCandidateResult[] = [];
  for (const candidate of allProfiles) {
    if (
      candidate.userId === requesterId ||
      candidate.availability === "BUSY" ||
      globalRejected.has(candidate.userId) ||
      pairExcluded.has(candidate.userId) ||
      !validProfile(candidate)
    ) continue;
    const sharedSkills = intersection(requester.skillTags, candidate.skillTags);
    candidates.push({
      ...candidate,
      similarityScore: calculateCosineSimilarity(requester.skillVector, candidate.skillVector),
      sharedSkills,
      sharedSkillCount: sharedSkills.length,
      ...generalExperienceProximity(requester, candidate),
    });
  }
  candidates.sort(compareExploreCandidates);
  const start = (page - 1) * limit;
  return { candidates: candidates.slice(start, start + limit), totalAvailable: candidates.length };
}

async function rankCandidates(
  requesterId: string,
  page: number,
  limit: number,
  intentRevision: number | undefined,
): Promise<RankerResponse> {
  const requester = await authoritativeRequester(requesterId, intentRevision);
  const intentType = requester.searchIntent!.intentType;
  const [allProfiles, globallyRejected, pairExcluded] = await Promise.all([
    getAllMatchProfiles(),
    getGlobalExcludedIds(requesterId),
    pairExcludedIds(requesterId),
  ]);
  const ordered: CandidateResult[] = [];
  for (const candidate of allProfiles) {
    if (
      candidate.userId === requesterId ||
      globallyRejected.has(candidate.userId) ||
      pairExcluded.has(candidate.userId)
    ) continue;
    const evaluated = evaluateRecommendation(requester, candidate, intentType);
    if (!evaluated) continue;
    ordered.push({
      ...candidate,
      ...evaluated.snapshot,
      ...generalExperienceProximity(requester, candidate),
      levelBand: levelBand(evaluated.snapshot.compatibility),
    });
  }
  ordered.sort(compareCandidateResults);
  const start = (page - 1) * limit;
  return {
    candidates: ordered.slice(start, start + limit),
    totalAvailable: ordered.length,
  };
}

export function getRankedCandidates(
  requesterId: string,
  page = 1,
  limit = 20,
  intentRevision?: number,
) {
  return rankCandidates(requesterId, page, limit, intentRevision);
}

export function getSimilarCandidates(
  requesterId: string,
  page = 1,
  limit = 20,
  intentRevision?: number,
) {
  return rankCandidates(requesterId, page, limit, intentRevision);
}
