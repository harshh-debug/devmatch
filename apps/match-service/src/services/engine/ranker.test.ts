import { describe, expect, it } from "bun:test";
import { buildSkillVector, SKILL_VECTOR_VERSION } from "@devmatch/shared";
import {
  compareCandidateResults,
  evaluateRecommendation,
} from "./ranker";
import type { CandidateResult, MatchProfile } from "./types";

function profile(
  userId: string,
  options: Partial<MatchProfile> & { skills: string[] },
): MatchProfile {
  return {
    userId,
    username: userId,
    displayName: userId,
    avatarUrl: null,
    college: null,
    skillTags: options.skills,
    topLanguages: [],
    lcRating: null,
    cfRating: null,
    skillVector: buildSkillVector({ skillTags: options.skills }),
    vectorVersion: SKILL_VECTOR_VERSION,
    availability: "ACTIVE",
    profileScore: 80,
    matchPreferencesRevision: 1,
    searchIntent: {
      intentType: "DSA",
      preferredLanguages: [],
      preferredDomains: [],
    },
    openToIntents: [],
    effectiveOpenToIntents: ["DSA"],
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
  it("requires shared DSA languages and applies Codeforces compatibility thresholds", () => {
    const requester = profile("requester", { skills: ["python", "typescript"], cfRating: 1500 });
    const near = profile("near", { skills: ["python"], cfRating: 1700 });
    const far = profile("far", { skills: ["python", "typescript"], cfRating: 2200 });

    expect(evaluateRecommendation(requester, near, "DSA")?.snapshot.compatibility).toBe("HIGH");
    expect(evaluateRecommendation(requester, far, "DSA")?.snapshot.compatibility).toBe("LOW");
    expect(evaluateRecommendation(requester, profile("none", { skills: ["java"] }), "DSA")).toBeNull();
  });

  it("keeps manual Project matching with unknown compatibility but rejects unusable Open Source", () => {
    const requester = profile("requester", {
      skills: ["typescript", "react", "web"],
      searchIntent: {
        intentType: "PROJECT",
        preferredLanguages: [],
        preferredDomains: [],
      },
    });
    const candidate = profile("candidate", {
      skills: ["typescript", "react", "web"],
      effectiveOpenToIntents: ["PROJECT", "OPENSOURCE"],
    });

    expect(evaluateRecommendation(requester, candidate, "PROJECT")?.snapshot.compatibility).toBe("UNKNOWN");
    expect(evaluateRecommendation(requester, candidate, "OPENSOURCE")).toBeNull();
  });

  it("keeps a passive candidate eligible through explicit inbound intents", () => {
    const requester = profile("requester", { skills: ["python"], cfRating: 1500 });
    const passiveCandidate = profile("passive", {
      skills: ["python"],
      cfRating: 1600,
      searchIntent: null,
      openToIntents: ["DSA"],
      effectiveOpenToIntents: ["DSA"],
    });

    expect(evaluateRecommendation(requester, passiveCandidate, "DSA")?.snapshot.compatibility)
      .toBe("HIGH");
  });

  it("uses the worse shared CP provider and returns unknown for different providers", () => {
    const requester = profile("requester", {
      skills: ["python"],
      cfRating: 1500,
      lcRating: 1_000,
    });
    const mixed = profile("mixed", {
      skills: ["python"],
      cfRating: 1600,
      lcRating: 6_000,
    });
    const differentProvider = profile("different", {
      skills: ["python"],
      cfRating: null,
      lcRating: 1_500,
    });
    requester.lcRating = null;

    const mixedRequester = { ...requester, lcRating: 1_000 };
    expect(evaluateRecommendation(mixedRequester, mixed, "DSA")?.snapshot)
      .toMatchObject({ compatibility: "LOW", levelSource: "MIXED_CP" });
    expect(evaluateRecommendation(requester, differentProvider, "DSA")?.snapshot)
      .toMatchObject({ compatibility: "UNKNOWN", levelSource: "UNKNOWN" });
  });

  it("treats optional preferences as a controlled relaxation without lowering the floor", () => {
    const requester = profile("requester", {
      skills: ["typescript", "react", "web"],
      searchIntent: {
        intentType: "PROJECT",
        preferredLanguages: ["python"],
        preferredDomains: ["web"],
      },
    });
    const candidate = profile("candidate", {
      skills: ["typescript", "react", "web"],
      effectiveOpenToIntents: ["PROJECT"],
    });
    const result = evaluateRecommendation(requester, candidate, "PROJECT");

    expect(result?.preferencesMatched).toBeFalse();
    expect(result?.snapshot.matchTier).toBe("RELAXED_PREFERENCES");
    expect(result?.snapshot.similarityScore).toBeGreaterThanOrEqual(0.2);
  });

  it("uses only GitHub-derived features for Open Source similarity", () => {
    const github = {
      connected: true,
      usable: true,
      contributionsLastYear: 250,
      activeWeeksLastYear: 30,
      stars: 20,
      topics: ["react"],
      lastSyncedAt: "2026-07-16T00:00:00.000Z",
    };
    const requester = profile("requester", {
      skills: ["python", "django"],
      topLanguages: ["typescript"],
      github,
      searchIntent: {
        intentType: "OPENSOURCE",
        preferredLanguages: [],
        preferredDomains: [],
      },
    });
    const candidate = profile("candidate", {
      skills: ["python", "django"],
      topLanguages: ["java"],
      github: { ...github, topics: ["spring"] },
      effectiveOpenToIntents: ["OPENSOURCE"],
    });
    const overlapping = profile("overlapping", {
      skills: ["rust"],
      topLanguages: ["typescript"],
      github: { ...github, topics: ["react"] },
      effectiveOpenToIntents: ["OPENSOURCE"],
    });

    expect(evaluateRecommendation(requester, candidate, "OPENSOURCE")).toBeNull();
    expect(evaluateRecommendation(requester, overlapping, "OPENSOURCE")?.snapshot)
      .toMatchObject({ compatibility: "HIGH", levelSource: "GITHUB" });
  });

  it("orders compatibility before a higher similarity score", () => {
    const base = profile("base", { skills: ["python"] });
    const high = {
      ...base,
      userId: "high",
      compatibility: "HIGH",
      similarityScore: 0.2,
      levelBand: "NEAR",
      levelSource: "CODEFORCES",
      matchedSkills: ["python"],
      matchedLanguages: ["python"],
      matchedDomains: [],
      matchTier: "STRICT",
    } satisfies CandidateResult;
    const medium = {
      ...high,
      userId: "medium",
      compatibility: "MEDIUM",
      similarityScore: 1,
      levelBand: "MID",
    } satisfies CandidateResult;

    expect([medium, high].sort(compareCandidateResults).map((candidate) => candidate.userId))
      .toEqual(["high", "medium"]);
  });
});
