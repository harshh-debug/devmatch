/**
 * Frontend-specific types. Shapes mirror the API contract in .claude/API.md.
 */
import type { ConnectionContext, IntentType } from "@devmatch/shared";

export type Availability = "ACTIVE" | "OPEN" | "BUSY";

export type {
  BuildOfferProfile,
  BuildSearchPreferences,
  CandidateExplanation,
  CapabilityEvidence,
  CollaborationMode,
  CollaborationRole,
  Compatibility,
  DsaGoal,
  DsaIntentConfiguration,
  DsaOfferProfile,
  DsaProviderPreference,
  DsaSearchPreferences,
  HackathonIntentConfiguration,
  IntentConfiguration,
  IntentConfigurationInput,
  IntentState,
  IntentType,
  ConnectionContext,
  LevelSource,
  NiceToHaveMatch,
  OpenSourceContributionType,
  OpenSourceIntentConfiguration,
  ProjectIntentConfiguration,
  ResolvedMatchMode,
} from "@devmatch/shared";

export type MessageType = "TEXT" | "CODE_SNIPPET" | "LINK";

/** Minimal user identity returned by auth flows. */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
}

/** Full user profile returned by GET /me and GET /users/:username. */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  displayName?: string;
  bio?: string;
  college?: string;
  availability?: Availability;
  /** Set for OAuth users: "github" | "credentials" */
  provider?: string;
  skillTags: string[];
  intentType?: IntentType;
  matchingOnboardingComplete?: boolean;
  leetcodeHandle?: string;
  githubUsername?: string;
  githubHandle?: string;
  codeforcesHandle?: string;
  cfRating?: number;
  lcRating?: number;
  githubContributions?: { days: { date: string; count: number }[] }[];
  lcTotalSolved?: number;
  lcEasySolved?: number;
  lcMediumSolved?: number;
  lcHardSolved?: number;
  githubStars?: number;
  contributionStreak?: number;
  topLanguages?: string[];
  /** Public LeetCode languages, ordered by accepted problems solved. */
  leetcodeLanguages?: string[];
  /** Language usage percentages, e.g. { TypeScript: 62, Rust: 24 }. */
  languages?: Record<string, number>;
}

/** Generic backend envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** Shape of the session stored on the client. */
export interface SessionUser extends AuthUser {
  accessToken: string;
  onboardingComplete: boolean;
}

/** A chat room returned by GET /chat/rooms. */
export interface ChatRoom {
  id: string;
  matchId: string;
  otherUserId: string;
  intentType: IntentType | null;
  unreadCount: number;
  updatedAt: string;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
}

export interface ExploreCandidate {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  college: string | null;
  availability: Availability;
  cfRating: number | null;
  lcRating: number | null;
  skillTags: string[];
  similarityScore: number;
  sharedSkills: string[];
  sharedSkillCount: number;
  experienceProximity: number;
  experienceSource: "CODEFORCES" | "LEETCODE" | "GITHUB" | "UNKNOWN";
}

export type ReadinessAction = "CONNECT_GITHUB" | "CONNECT_LEETCODE" | "CONNECT_CODEFORCES" | "ADD_SKILLS" | "COMPLETE_INTENT";

export interface MatchReadiness {
  profileScore: number;
  isMatchReady: boolean;
  technicalSignalReady: boolean;
  vectorReady: boolean;
  activeIntentReady: boolean;
  githubUsable: boolean;
  leetcodeSynced: boolean;
  codeforcesSynced: boolean;
  githubSyncStatus: "NOT_CONNECTED" | "SYNCING" | "COMPLETE" | "FAILED" | "UNKNOWN";
  blockers: string[];
  recommendedActions: ReadinessAction[];
  activeIntent: IntentType | null;
}
