/**
 * Computes the cosine similarity between two skill vectors.
 * Returns a float between 0 (completely dissimilar) and 1 (identical).
 */
export function calculateCosineSimilarity(
    vecA: readonly number[],
    vecB: readonly number[]
): number {
    if (vecA.length === 0 || vecA.length !== vecB.length) {
        return 0;
    }

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i]!;
        const b = vecB[i]!;

        dot += a * b;
        magA += a * a;
        magB += b * b;
    }

    if (magA === 0 || magB === 0) {
        return 0;
    }

    return dot / Math.sqrt(magA * magB);
}