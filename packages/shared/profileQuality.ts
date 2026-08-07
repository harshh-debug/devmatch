export interface ProfileQualityInput {
  displayName?: string | null;
  bio?: string | null;
  college?: string | null;
  skillCount: number;
  githubUsable: boolean;
  leetcodeSynced: boolean;
  codeforcesSynced: boolean;
  activeIntentComplete: boolean;
}

/** A product-facing profile quality score. Eligibility is evaluated separately. */
export function calculateProfileScore(input: ProfileQualityInput): number {
  let score = 0;
  if (input.displayName?.trim()) score += 5;
  if (input.bio?.trim()) score += 5;
  if (input.college?.trim()) score += 5;
  if (input.skillCount >= 3) score += 15;
  else if (input.skillCount > 0) score += 7;
  if (input.githubUsable) score += 30;
  if (input.leetcodeSynced) score += 15;
  if (input.codeforcesSynced) score += 15;
  if (input.activeIntentComplete) score += 10;
  return score;
}
