import type { ScoredCandidate, FilterRules } from "./types";

/**
 * Applies strict business rules to a list of mathematically scored candidates.
 * Returns only the candidates valid to show to the requesting user.
 */
export function applyHardFilters(
    candidates: ScoredCandidate[],
    rules: FilterRules
): ScoredCandidate[] {
    return candidates.filter((candidate) => {
        // 1. Identity & History Exclusions
        if (candidate.userId === rules.requesterId) return false;
        if (rules.seenIds.has(candidate.userId)) return false;

        // 2. Profile Quality Gating
        if (candidate.profileScore < rules.minProfileScore) return false;
        if (candidate.similarityScore < rules.minSimilarityScore) return false;

        // 3. Availability & Intent Matching
        if (candidate.availability === "BUSY") return false;
        if (!candidate.activeIntents.includes(rules.intentType)) return false;

        // 4. Rating Brackets (Required for DSA)
        if (rules.ratingMin !== undefined) {
            if (candidate.cfRating === null || candidate.cfRating < rules.ratingMin) {
                return false;
            }
        }
        
        if (rules.ratingMax !== undefined) {
            if (candidate.cfRating === null || candidate.cfRating > rules.ratingMax) {
                return false;
            }
        }

        return true; // Passed all filters!
    });
}