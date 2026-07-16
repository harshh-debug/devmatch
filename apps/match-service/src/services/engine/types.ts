import type {
  Compatibility,
  IntentPreferences,
  IntentType,
  LevelSource,
  MatchTier,
} from "@devmatch/shared";

export type { Compatibility, IntentPreferences, IntentType, LevelSource, MatchTier };
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
  matchPreferencesRevision: number;
  searchIntent: IntentPreferences | null;
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

export interface CandidateResult extends MatchProfile {
  similarityScore: number;
  compatibility: Compatibility;
  levelBand: "NEAR" | "MID" | "FAR" | "UNKNOWN";
  levelSource: LevelSource;
  matchedSkills: string[];
  matchedLanguages: string[];
  matchedDomains: string[];
  matchTier: MatchTier;
}

export interface RecommendationSnapshot {
  similarityScore: number;
  compatibility: Compatibility;
  levelSource: LevelSource;
  matchedSkills: string[];
  matchedLanguages: string[];
  matchedDomains: string[];
  matchTier: MatchTier;
  explanation: {
    intentType: IntentType;
    compatibility: Compatibility;
    levelSource: LevelSource;
    matchTier: MatchTier;
  };
}
