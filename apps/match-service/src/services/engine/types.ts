export type IntentType = "DSA" | "HACKATHON" | "PROJECT" | "OPENSOURCE";
export type Availability = "ACTIVE" | "OPEN" | "BUSY";

/**
 * The flat JSON structure we will eventually store in Redis.
 * It contains exactly what we need to calculate and filter a match, 
 * without ever touching the PostgreSQL database.
 */
export interface MatchProfile {
    userId: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    college?: string | null;
    skillTags?: string[];
    lcRating?: number | null;
    skillVector: number[];
    activeIntents: IntentType[]; 
    availability: Availability;
    cfRating: number | null;
    profileScore: number;
}

/**
 * Extends the profile with the computed mathematical score.
 */
export interface ScoredCandidate extends MatchProfile {
    similarityScore: number;
}

export interface FilterRules {
    requesterId: string;
    intentType: IntentType;
    seenIds: Set<string>;
    minSimilarityScore: number; 
    minProfileScore: number; 
    ratingMin?: number;
    ratingMax?: number;
}
