import type {
  CapabilityEvidence,
  CollaborationRole,
  Compatibility,
  DsaGoal,
  IntentConfiguration,
  IntentType,
  LevelSource,
  NiceToHaveMatch,
  OpenSourceContributionType,
  ResolvedMatchMode,
} from "@devmatch/shared";

export type {
  CapabilityEvidence,
  CollaborationRole,
  Compatibility,
  DsaGoal,
  IntentConfiguration,
  IntentType,
  LevelSource,
  NiceToHaveMatch,
  OpenSourceContributionType,
  ResolvedMatchMode,
};
export type Availability = "ACTIVE" | "OPEN" | "BUSY";

export interface MatchProfile {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  college?: string | null;
  skillTags: string[];
  topLanguages: string[];
  lcRating: number | null;
  cfRating: number | null;
  skillVector: number[];
  vectorVersion: number;
  availability: Availability;
  profileScore: number;
  /** Derived by the cache; optional for legacy cached/test profiles. */
  technicalSignalReady?: boolean;
  matchPreferencesRevision: number;
  searchIntent: IntentConfiguration | null;
  intentConfigurations: Partial<Record<IntentType, IntentConfiguration>>;
  openToIntents: IntentType[];
  effectiveOpenToIntents: IntentType[];
  github: {
    connected: boolean;
    usable: boolean;
    contributionsLastYear: number | null;
    activeWeeksLastYear: number | null;
    stars: number | null;
    topics: string[];
    lastSyncedAt: string | null;
  };
}

export interface CandidateResult extends MatchProfile, RecommendationSnapshot {
  technicalFitScore: number;
  levelBand: "NEAR" | "MID" | "FAR" | "UNKNOWN";
  experienceProximity: number;
  experienceSource: "CODEFORCES" | "LEETCODE" | "GITHUB" | "UNKNOWN";
}

export interface ExploreCandidateResult extends MatchProfile {
  similarityScore: number;
  sharedSkills: string[];
  sharedSkillCount: number;
  experienceProximity: number;
  experienceSource: "CODEFORCES" | "LEETCODE" | "GITHUB" | "UNKNOWN";
}

export interface RecommendationSnapshot {
  similarityScore: number;
  technicalFitScore: number;
  compatibility: Compatibility;
  levelSource: LevelSource;
  resolvedMatchMode: ResolvedMatchMode;
  matchedSkills: string[];
  matchedLanguages: string[];
  matchedFrameworks: string[];
  matchedDomains: string[];
  matchedRoles: CollaborationRole[];
  matchedGoals: DsaGoal[];
  matchedContributionTypes: OpenSourceContributionType[];
  matchedRepositoryTopics: string[];
  niceToHave: NiceToHaveMatch;
  capabilityEvidence: CapabilityEvidence[];
  reasonCodes: string[];
  explanation: {
    intentType: IntentType;
    compatibility: Compatibility;
    levelSource: LevelSource;
    resolvedMatchMode: ResolvedMatchMode;
    reasonCodes: string[];
    capabilityEvidence: CapabilityEvidence[];
  };
}
