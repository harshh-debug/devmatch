/**
 * Frontend-specific types. Shapes mirror the API contract in .claude/API.md.
 */

export type Availability = "ACTIVE" | "OPEN" | "BUSY";

export type IntentType = "DSA" | "HACKATHON" | "PROJECT" | "OPENSOURCE";
export type Compatibility = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
export type LevelSource = "CODEFORCES" | "LEETCODE" | "MIXED_CP" | "GITHUB" | "UNKNOWN";
export type MatchTier = "STRICT" | "RELAXED_PREFERENCES";

export interface IntentPreferences {
  intentType: IntentType;
  ratingMin?: number;
  ratingMax?: number;
  preferredLanguages: string[];
  preferredDomains: string[];
}

export interface IntentState {
  searchIntent: IntentPreferences | null;
  openToIntents: IntentType[];
  effectiveOpenToIntents: IntentType[];
  revision: number;
}

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
  profileCompleteness?: number;
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
