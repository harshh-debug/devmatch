import { normalizeSkillTags } from "@devmatch/shared";

export const skillTagMapper = {
    normalizeTags(rawTags: string[]): string[] {
        return normalizeSkillTags(rawTags);
    }
};
