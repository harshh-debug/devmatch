export interface VectorProfile {
    skillTags?: string[] | null;
    lcRating?: number | null;
    cfRating?: number | null;
}

// 2. Your exact original dimensions
const LANGUAGES = ['typescript','javascript','python','java','cpp','go','rust','kotlin'];
const FRAMEWORKS = ['react','node','django','spring','flutter','nextjs'];
const DOMAINS = ['dsa','web','ml','mobile','devops','blockchain'];

export function buildSkillVector(profile: VectorProfile): number[] {
    // Convert tags to lowercase once to ensure the parser's GitHub tags match perfectly
    const tags = (profile.skillTags || []).map(tag => tag.toLowerCase());

    // 1 for matching tag, 0 for missing
    const langVector = LANGUAGES.map(l => tags.includes(l) ? 1 : 0);
    const frameVector = FRAMEWORKS.map(f => tags.includes(f) ? 1 : 0);
    const domainVector = DOMAINS.map(d => tags.includes(d) ? 1 : 0);

    // Normalize ratings
    const lcNorm = profile.lcRating ? profile.lcRating / 3500 : 0;
    const cfNorm = profile.cfRating ? profile.cfRating / 3500 : 0;

    return [...langVector, ...frameVector, ...domainVector, lcNorm, cfNorm];
}