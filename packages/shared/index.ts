export interface VectorProfile {
    skillTags?: string[] | null;
    lcRating?: number | null;
    cfRating?: number | null;
}

export type IntentType = 'DSA' | 'HACKATHON' | 'PROJECT' | 'OPENSOURCE';
export type Compatibility = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type LevelSource = 'CODEFORCES' | 'LEETCODE' | 'MIXED_CP' | 'GITHUB' | 'UNKNOWN';
export type MatchTier = 'STRICT' | 'RELAXED_PREFERENCES';

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

export interface MatchPreferencesUpdatedV1 {
    eventId: string;
    schemaVersion: 1;
    eventType: 'MATCH_PREFERENCES_UPDATED';
    userId: string;
    revision: number;
    occurredAt: string;
}

export const SKILL_VECTOR_VERSION = 1;

export const SKILL_LANGUAGES = ['typescript','javascript','python','java','cpp','go','rust','kotlin'] as const;
export const SKILL_FRAMEWORKS = ['react','node','django','spring','flutter','nextjs'] as const;
export const SKILL_DOMAINS = ['dsa','web','ml','mobile','devops','blockchain'] as const;
const LANGUAGES = SKILL_LANGUAGES;
const FRAMEWORKS = SKILL_FRAMEWORKS;
const DOMAINS = SKILL_DOMAINS;
export const SKILL_VECTOR_DIMENSIONS = LANGUAGES.length + FRAMEWORKS.length + DOMAINS.length + 2;
export const SKILL_VECTOR_FEATURE_DIMENSIONS = LANGUAGES.length + FRAMEWORKS.length + DOMAINS.length;
export const SKILL_LANGUAGE_INDICES = LANGUAGES.map((_, index) => index);
export const SKILL_TECHNICAL_INDICES = Array.from(
    { length: SKILL_VECTOR_FEATURE_DIMENSIONS },
    (_, index) => index,
);

/** Maps UI labels and provider-specific spellings to the matching taxonomy. */
const SKILL_ALIASES: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    'node.js': 'node',
    nodejs: 'node',
    express: 'node',
    reactjs: 'react',
    'react.js': 'react',
    'next.js': 'nextjs',
    'c++': 'cpp',
    'machine learning': 'ml',
    'machine-learning': 'ml',
    'artificial intelligence': 'ml',
    ai: 'ml',
    algorithms: 'dsa',
    algorithm: 'dsa',
    'data structures': 'dsa',
    'web development': 'web',
    'web3': 'blockchain',
    aws: 'devops',
    docker: 'devops',
    kubernetes: 'devops',
};

export function normalizeSkillTags(rawTags: readonly string[] | null | undefined): string[] {
    const normalized = new Set<string>();
    for (const rawTag of rawTags ?? []) {
        const tag = rawTag.trim().toLowerCase();
        if (!tag) continue;
        normalized.add(SKILL_ALIASES[tag] ?? tag);
    }
    return [...normalized];
}

export function normalizePreferredLanguages(rawTags: readonly string[] | null | undefined): string[] {
    const languages = new Set<string>(LANGUAGES);
    return normalizeSkillTags(rawTags).filter((tag) => languages.has(tag));
}

export function normalizePreferredDomains(rawTags: readonly string[] | null | undefined): string[] {
    const domains = new Set<string>(DOMAINS);
    return normalizeSkillTags(rawTags).filter((tag) => domains.has(tag));
}

export function classifyCanonicalSkills(rawTags: readonly string[] | null | undefined) {
    const tags = normalizeSkillTags(rawTags);
    const languageSet = new Set<string>(LANGUAGES);
    const frameworkSet = new Set<string>(FRAMEWORKS);
    const domainSet = new Set<string>(DOMAINS);
    return {
        all: tags.filter((tag) => languageSet.has(tag) || frameworkSet.has(tag) || domainSet.has(tag)),
        languages: tags.filter((tag) => languageSet.has(tag)),
        frameworks: tags.filter((tag) => frameworkSet.has(tag)),
        domains: tags.filter((tag) => domainSet.has(tag)),
    };
}

export function projectSkillVector(vector: readonly number[], indices: readonly number[]): number[] {
    return indices.map((index) => vector[index] ?? 0);
}

/** Converts a lower-is-better LeetCode global rank into a bounded skill score. */
function normalizeLeetCodeGlobalRank(rank: number | null | undefined): number {
    if (!rank || rank < 1) return 0;
    // Log scaling preserves meaningful differences at strong ranks without
    // allowing a large absolute rank to overpower the skill dimensions.
    return 1 / (1 + Math.log10(rank));
}

export function buildSkillVector(profile: VectorProfile): number[] {
    const tags = normalizeSkillTags(profile.skillTags);

    // 1 for matching tag, 0 for missing
    const langVector = LANGUAGES.map(l => tags.includes(l) ? 1 : 0);
    const frameVector = FRAMEWORKS.map(f => tags.includes(f) ? 1 : 0);
    const domainVector = DOMAINS.map(d => tags.includes(d) ? 1 : 0);

    // Normalize ratings
    // `lcRating` currently stores LeetCode's global rank, where lower is better.
    const lcNorm = normalizeLeetCodeGlobalRank(profile.lcRating);
    const cfNorm = profile.cfRating ? profile.cfRating / 3500 : 0;

    return [...langVector, ...frameVector, ...domainVector, lcNorm, cfNorm];
}
