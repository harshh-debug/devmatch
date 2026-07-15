export interface VectorProfile {
    skillTags?: string[] | null;
    lcRating?: number | null;
    cfRating?: number | null;
}

export const SKILL_VECTOR_VERSION = 1;

const LANGUAGES = ['typescript','javascript','python','java','cpp','go','rust','kotlin'];
const FRAMEWORKS = ['react','node','django','spring','flutter','nextjs'];
const DOMAINS = ['dsa','web','ml','mobile','devops','blockchain'];
export const SKILL_VECTOR_DIMENSIONS = LANGUAGES.length + FRAMEWORKS.length + DOMAINS.length + 2;

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
