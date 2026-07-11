/**
 * Frontend-specific types. Shapes mirror the API contract in .claude/API.md.
 */

export type Availability = "ACTIVE" | "OPEN" | "BUSY";

export type IntentType = "DSA" | "HACKATHON" | "PROJECT" | "OPENSOURCE";

export type MessageType = "TEXT" | "CODE_SNIPPET" | "LINK";

/** Minimal user identity returned by auth flows. */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

/** Full user profile returned by GET /me and GET /users/:username. */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  college?: string;
  availability?: Availability;
  /** Set for OAuth users: "github" | "credentials" */
  provider?: string;
  skillTags: string[];
  intentType?: IntentType;
  leetcodeHandle?: string;
  githubHandle?: string;
  codeforcesHandle?: string;
  cfRating?: number;
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
