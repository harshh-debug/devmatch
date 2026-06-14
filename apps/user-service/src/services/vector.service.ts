import type { Profile } from 'db/client';

// The dimensions of your vector map. Expand these as the platform grows.
const LANGUAGES = ['typescript','javascript','python','java','cpp','go','rust','kotlin'];
const FRAMEWORKS = ['react','node','django','spring','flutter','nextjs'];
const DOMAINS = ['dsa','web','ml','mobile','devops','blockchain'];

export const vectorService = {
  buildSkillVector(profile: Partial<Profile>): number[] {
    const tags = profile.skillTags || [];

    // 1 for matching tag, 0 for missing
    const langVector = LANGUAGES.map(l => tags.includes(l) ? 1 : 0);
    const frameVector = FRAMEWORKS.map(f => tags.includes(f) ? 1 : 0);
    const domainVector = DOMAINS.map(d => tags.includes(d) ? 1 : 0);

    // Normalize ratings so massive ELO scores don't break the cosine math
    const lcNorm = profile.lcRating ? profile.lcRating / 3500 : 0;
    const cfNorm = profile.cfRating ? profile.cfRating / 3500 : 0;

    return [...langVector, ...frameVector, ...domainVector, lcNorm, cfNorm];
  }
};