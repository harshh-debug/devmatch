import { getAllMatchProfiles, getSeenIds } from "../cache/vectorCache";
import { calculateCosineSimilarity } from "./cosine";
import { applyHardFilters } from "./filter";
import type { IntentType, ScoredCandidate, FilterRules } from "./types";

export interface RankerResponse {
    candidates: ScoredCandidate[];
    relaxed: boolean;       // Tells the frontend to show "We widened your search"
    totalAvailable: number; // Useful for frontend pagination metadata
}

/**
 * Orchestrates the cache, math, and filtering to return a ranked list of candidates.
 */
export async function getRankedCandidates(
    requesterId: string,
    intentType: IntentType,
    page: number = 1,
    limit: number = 20,
    ratingMin?: number,
    ratingMax?: number
): Promise<RankerResponse> {
    
    // 1. Fetch the global candidate pool and the user's specific swipe history concurrently
    const [allProfiles, seenIds] = await Promise.all([
        getAllMatchProfiles(),
        getSeenIds(requesterId, intentType)
    ]);

    // 2. Locate the requester in the pool to extract their vector
    const requesterProfile = allProfiles.find(p => p.userId === requesterId);

    // If requester is not in the cache, they don't meet the minimum bar to participate
    if (!requesterProfile) {
        return { candidates: [], relaxed: false, totalAvailable: 0 };
    }

    // 3. Single-Pass Math computation (O(N) - executes in ~2-5ms for 10,000 users)
    const scoredPool: ScoredCandidate[] = allProfiles.map(profile => ({
        ...profile,
        similarityScore: calculateCosineSimilarity(
            requesterProfile.skillVector, 
            profile.skillVector
        )
    }));

    // 4. Define Base Rules (Strict Match)
    const baseRules: FilterRules = {
        requesterId,
        intentType,
        seenIds,
        minSimilarityScore: 0.35, // Strict similarity threshold
        minProfileScore: 30,
        ratingMin,
        ratingMax
    };

    // 5. Attempt 1: Strict Filtering
    let validCandidates = applyHardFilters(scoredPool, baseRules);
    let isRelaxed = false;

    // 6. Attempt 2: Relaxed Filtering (Widen the Rating Bracket by 200)
    // Only applies if the user actually provided rating constraints
    if (validCandidates.length < limit && (ratingMin !== undefined || ratingMax !== undefined)) {
        const relaxedRatingRules: FilterRules = {
            ...baseRules,
            ratingMin: ratingMin !== undefined ? ratingMin - 200 : undefined,
            ratingMax: ratingMax !== undefined ? ratingMax + 200 : undefined,
        };
        validCandidates = applyHardFilters(scoredPool, relaxedRatingRules);
        isRelaxed = true;
    }

    // 7. Attempt 3: Maximum Relaxation (Drop ratings entirely, lower similarity)
    if (validCandidates.length < limit) {
        const maxRelaxedRules: FilterRules = {
            ...baseRules,
            ratingMin: undefined, // Ignore CP rating constraints
            ratingMax: undefined,
            minSimilarityScore: 0.20 // Lower mathematical threshold
        };
        validCandidates = applyHardFilters(scoredPool, maxRelaxedRules);
        isRelaxed = true; // Flag for frontend UI
    }

    // 8. Rank by best mathematical match
    validCandidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // 9. Paginate for the API response
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCandidates = validCandidates.slice(startIndex, endIndex);

    return {
        candidates: paginatedCandidates,
        relaxed: isRelaxed,
        totalAvailable: validCandidates.length
    };
}