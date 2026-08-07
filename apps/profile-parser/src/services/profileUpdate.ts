import { prismaClient } from "db/client";
import { skillTagMapper } from "./skillTagMapper";
import { buildSkillVector, calculateProfileScore } from "@devmatch/shared";

async function recomputeProfileScore(userId: string) {
    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        include: { profile: true, searchIntent: true },
    });
    if (!user?.profile) return 0;

    const githubUsable = Boolean(user.profile.githubUsername && user.profile.githubLastSyncedAt && (
        user.profile.topLanguages.length > 0 || user.profile.githubTopics.length > 0 || Array.isArray(user.profile.githubContributions)
    ));
    const score = calculateProfileScore({
        displayName: user.displayName,
        bio: user.bio,
        college: user.college,
        skillCount: user.profile.skillTags.length,
        githubUsable,
        leetcodeSynced: Boolean(user.profile.leetcodeLastSyncedAt),
        codeforcesSynced: Boolean(user.profile.codeforcesLastSyncedAt),
        activeIntentComplete: Boolean(user.searchIntent),
    });

    await prismaClient.profile.update({ where: { userId }, data: { profileScore: score } });
    return score;
}

export const profileUpdater = {
    async updateGitHubStats(userId: string, fetchedData: any) {
        const existingProfile = await prismaClient.profile.findUnique({
            where: { userId },
            select: { skillTags: true, lcRating: true, cfRating: true }
        });

        if (!existingProfile) throw new Error("Profile not found");

        const normalizedNewTags = skillTagMapper.normalizeTags([
            ...fetchedData.topLanguages, 
            ...fetchedData.inferredTopics
        ]);
        const githubTopics = skillTagMapper.normalizeTags(fetchedData.inferredTopics);
        
        // Re-normalize existing data too. Older profiles can contain a display
        // label (for example "TypeScript") alongside parser output
        // ("typescript"); both must resolve to one canonical skill.
        const mergedTags = skillTagMapper.normalizeTags([
            ...existingProfile.skillTags, 
            ...normalizedNewTags
        ]);

        // Rebuild the Vector with the newly merged tags and existing ratings
        const newVector = buildSkillVector({
            skillTags: mergedTags,
            lcRating: existingProfile.lcRating,
            cfRating: existingProfile.cfRating
        });

        const updatedProfile = await prismaClient.profile.update({
            where: { userId },
            data: {
                githubStars: fetchedData.githubStars,
                contributionStreak: fetchedData.contributionStreak,
                githubContributions: fetchedData.githubContributions,
                topLanguages: fetchedData.topLanguages,
                githubTopics,
                githubLastSyncedAt: new Date(),
                skillTags: mergedTags,
                skillVector: newVector, 
                lastSyncedAt: new Date(),
            }
        });
        await recomputeProfileScore(userId);
        return updatedProfile;
    },

    async updateLeetCodeStats(userId: string,handle: string, fetchedData:any) {
        const existingProfile = await prismaClient.profile.findUnique({
            where: { userId },
            select: { skillTags: true, cfRating: true }
        });

        if (!existingProfile) throw new Error("Profile not found");

        // LeetCode exposes accepted-problem counts per language. Persist the
        // ranked list as source data and add only the leading language to the
        // user's skills; using every historical language would overstate skills.
        const skillTags = skillTagMapper.normalizeTags([
            ...existingProfile.skillTags,
            ...(fetchedData.mostUsedLanguage ? [fetchedData.mostUsedLanguage] : []),
        ]);

        // Rebuild the Vector with the new rating and canonicalized skills.
        const newVector = buildSkillVector({
            skillTags,
            lcRating: fetchedData.lcRating,
            cfRating: existingProfile.cfRating
        });

        const updatedProfile = await prismaClient.profile.update({
            where: { userId },
            data: {
                leetcodeHandle:handle,
                lcRating: fetchedData.lcRating,
                lcContestsAttended: fetchedData.lcContestsAttended,
                lcTotalSolved: fetchedData.lcTotalSolved,
                lcEasySolved: fetchedData.lcEasySolved,
                lcMediumSolved: fetchedData.lcMediumSolved,
                lcHardSolved: fetchedData.lcHardSolved,
                leetcodeLanguages: fetchedData.leetcodeLanguages ?? [],
                leetcodeLastSyncedAt: new Date(),
                skillTags,
                skillVector: newVector,
                lastSyncedAt: new Date(),
            }
        });
        await recomputeProfileScore(userId);
        return updatedProfile;
    },

    async updateCodeforcesStats(userId: string,handle: string, fetchedData: any) {
        const existingProfile = await prismaClient.profile.findUnique({
            where: { userId },
            select: { skillTags: true, lcRating: true }
        });

        if (!existingProfile) throw new Error("Profile not found");

        // Rebuild the Vector with the NEW CF rating
        const newVector = buildSkillVector({
            skillTags: existingProfile.skillTags,
            lcRating: existingProfile.lcRating,
            cfRating: fetchedData.cfRating // <-- New data
        });

        const updatedProfile = await prismaClient.profile.update({
            where: { userId },
            data: {
                codeforcesHandle: handle,
                cfRating: fetchedData.cfRating,
                codeforcesLastSyncedAt: new Date(),
                skillVector: newVector,
                lastSyncedAt: new Date(),
            }
        });
        await recomputeProfileScore(userId);
        return updatedProfile;
    }
};
