import { describe, expect, it } from "bun:test";
import {
  SKILL_VECTOR_VERSION,
  buildSkillVector,
  type IntentConfiguration,
} from "@devmatch/shared";
import { compareCandidateResults, compareExploreCandidates, evaluateRecommendation } from "./ranker";
import type { CandidateResult, ExploreCandidateResult, MatchProfile, RecommendationSnapshot } from "./types";

const metadata = {
  availableVerifiedCapabilities: {
    languages: [],
    frameworks: [],
    domains: [],
    repositoryTopics: [],
  },
  offerEvidence: [],
};

function complete<T extends Omit<IntentConfiguration, "completeness" | "metadata" | "updatedAt">>(
  input: T,
): IntentConfiguration {
  return {
    ...input,
    completeness: {
      offerComplete: true,
      searchComplete: true,
      offerIssues: [],
      searchIssues: [],
    },
    metadata,
    updatedAt: "2026-07-17T00:00:00.000Z",
  } as IntentConfiguration;
}

function dsa(languages = ["python"], goals: ("INTERVIEW_PREP" | "COMPETITIVE_PROGRAMMING")[] = ["INTERVIEW_PREP"]) {
  return complete({
    intentType: "DSA",
    offer: { languages, goals },
    search: {
      requiredLanguages: languages,
      requiredGoals: goals,
      niceToHaveLanguages: [],
      niceToHaveGoals: [],
      providerPreference: "EITHER",
    },
  });
}

function project(
  role: "FRONTEND" | "ML_AI",
  language: string,
  mode: "SIMILAR" | "COMPLEMENTARY" | "EITHER" = "SIMILAR",
) {
  return complete({
    intentType: "PROJECT",
    offer: {
      roles: [role],
      languages: [language],
      frameworks: role === "FRONTEND" ? ["react"] : [],
      domains: role === "ML_AI" ? ["ml"] : ["web"],
    },
    search: {
      collaborationMode: mode,
      requiredRoles: mode === "COMPLEMENTARY" ? ["ML_AI"] : [role],
      requiredLanguages: mode === "COMPLEMENTARY" ? ["python"] : [language],
      requiredFrameworks: [],
      requiredDomains: [],
      niceToHaveRoles: [],
      niceToHaveLanguages: [],
      niceToHaveFrameworks: [],
      niceToHaveDomains: [],
    },
  });
}

function profile(
  userId: string,
  configuration: IntentConfiguration,
  options: Partial<MatchProfile> = {},
): MatchProfile {
  return {
    userId,
    username: userId,
    displayName: userId,
    avatarUrl: null,
    college: null,
    skillTags: ["typescript"],
    topLanguages: [],
    lcRating: 10000,
    cfRating: 1500,
    skillVector: buildSkillVector({ skillTags: ["typescript"] }),
    vectorVersion: SKILL_VECTOR_VERSION,
    availability: "ACTIVE",
    profileScore: 80,
    matchPreferencesRevision: 1,
    searchIntent: configuration,
    intentConfigurations: { [configuration.intentType]: configuration },
    openToIntents: [],
    effectiveOpenToIntents: [configuration.intentType],
    github: {
      connected: false,
      usable: false,
      contributionsLastYear: null,
      activeWeeksLastYear: null,
      stars: null,
      topics: [],
      lastSyncedAt: null,
    },
    ...options,
  };
}

describe("intent-specific matching", () => {
  it("uses DSA offer languages and goals rather than general profile skills", () => {
    const requester = profile("requester", dsa(["cpp"]));
    const candidate = profile("candidate", dsa(["cpp"]), {
      skillTags: ["typescript"],
      skillVector: buildSkillVector({ skillTags: ["typescript"] }),
    });
    const wrongGoal = profile("wrong-goal", dsa(["cpp"], ["COMPETITIVE_PROGRAMMING"]));

    expect(evaluateRecommendation(requester, candidate, "DSA")?.snapshot.matchedLanguages)
      .toEqual(["cpp"]);
    expect(evaluateRecommendation(requester, wrongGoal, "DSA")).toBeNull();
  });

  it("applies inclusive provider ranges", () => {
    const configuration = dsa(["python"]);
    if (configuration.intentType !== "DSA") throw new Error("fixture");
    configuration.search.providerPreference = "CODEFORCES";
    configuration.search.codeforcesRatingMin = 1400;
    configuration.search.codeforcesRatingMax = 1600;
    const requester = profile("requester", configuration);

    expect(evaluateRecommendation(requester, profile("edge", dsa(), { cfRating: 1600 }), "DSA"))
      .not.toBeNull();
    expect(evaluateRecommendation(requester, profile("outside", dsa(), { cfRating: 1601 }), "DSA"))
      .toBeNull();
  });

  it("supports complementary Project matching without requester overlap", () => {
    const requester = profile("requester", project("FRONTEND", "typescript", "COMPLEMENTARY"));
    const candidate = profile("candidate", project("ML_AI", "python"));
    candidate.effectiveOpenToIntents = ["PROJECT"];

    expect(evaluateRecommendation(requester, candidate, "PROJECT")?.snapshot)
      .toMatchObject({
        resolvedMatchMode: "COMPLEMENTARY",
        matchedRoles: ["ML_AI"],
        matchedLanguages: ["python"],
      });
  });

  it("uses domains as the Project gate while roles and languages rank the result", () => {
    const configuration = project("FRONTEND", "typescript");
    if (configuration.intentType !== "PROJECT") throw new Error("fixture");
    configuration.search.requiredDomains = ["ml"];
    const requester = profile("requester", configuration);
    const candidate = profile("candidate", project("ML_AI", "python"));

    expect(evaluateRecommendation(requester, candidate, "PROJECT")?.snapshot)
      .toMatchObject({ matchedDomains: ["ml"], matchedRoles: [], matchedLanguages: [] });
    const candidateProject = candidate.intentConfigurations.PROJECT;
    if (!candidateProject || candidateProject.intentType !== "PROJECT") throw new Error("fixture");
    candidateProject.offer.domains = ["web"];
    expect(evaluateRecommendation(requester, candidate, "PROJECT")).toBeNull();
  });

  it("keeps For You inbound-intent eligibility even when a profile is otherwise valid for Explore", () => {
    const requester = profile("requester", dsa());
    const candidate = profile("candidate", dsa(), { effectiveOpenToIntents: [] });
    expect(evaluateRecommendation(requester, candidate, "DSA")).toBeNull();
  });

  it("orders compatibility before nice-to-have and technical fit", () => {
    const baseProfile = profile("base", dsa());
    const baseSnapshot: RecommendationSnapshot = {
      similarityScore: 0.2,
      technicalFitScore: 0.2,
      compatibility: "HIGH",
      levelSource: "CODEFORCES",
      resolvedMatchMode: "DIRECT",
      matchedSkills: ["python"],
      matchedLanguages: ["python"],
      matchedFrameworks: [],
      matchedDomains: [],
      matchedRoles: [],
      matchedGoals: ["INTERVIEW_PREP"],
      matchedContributionTypes: [],
      matchedRepositoryTopics: [],
      niceToHave: { matchedGroupCount: 0, totalGroupCount: 0, matchedValueCount: 0 },
      capabilityEvidence: [],
      reasonCodes: [],
      explanation: {
        intentType: "DSA",
        compatibility: "HIGH",
        levelSource: "CODEFORCES",
        resolvedMatchMode: "DIRECT",
        reasonCodes: [],
        capabilityEvidence: [],
      },
    };
    const high = {
      ...baseProfile,
      ...baseSnapshot,
      userId: "high",
      levelBand: "NEAR",
    } satisfies CandidateResult;
    const medium = {
      ...high,
      userId: "medium",
      compatibility: "MEDIUM",
      technicalFitScore: 1,
      similarityScore: 1,
      levelBand: "MID",
    } satisfies CandidateResult;

    expect([medium, high].sort(compareCandidateResults).map((candidate) => candidate.userId))
      .toEqual(["high", "medium"]);
  });
});

describe("Explore ordering", () => {
  function explore(userId: string, overrides: Partial<ExploreCandidateResult> = {}): ExploreCandidateResult {
    return {
      ...profile(userId, dsa(), { searchIntent: null, intentConfigurations: {}, effectiveOpenToIntents: [] }),
      similarityScore: 0.8,
      sharedSkills: ["typescript"],
      sharedSkillCount: 1,
      experienceProximity: 0.5,
      experienceSource: "CODEFORCES",
      ...overrides,
    };
  }

  it("uses the documented deterministic tuple without intent eligibility", () => {
    const candidates = [
      explore("z", { profileScore: 99 }),
      explore("a", { profileScore: 99 }),
      explore("skills", { sharedSkillCount: 2 }),
      explore("similar", { similarityScore: 0.9, sharedSkillCount: 0 }),
    ];
    expect(candidates.sort(compareExploreCandidates).map((candidate) => candidate.userId))
      .toEqual(["similar", "skills", "a", "z"]);
  });
});
