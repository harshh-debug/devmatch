import { prismaClient } from "db/client";
import { skillTagMapper } from "./skillTagMapper";
import { buildSkillVector } from "@devmatch/shared";

async function recomputeProfileScore(userId: string) {
    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        include: { profile: true },
    });
    if (!user?.profile) return 0;

    let score = 0;
    if (user.displayName) score += 20;
    if (user.profile.skillTags.length >= 3) score += 20;
    if (user.profile.githubUsername) score += 20;
    if (user.profile.lcRating) score += 10;
    if (user.profile.cfRating) score += 10;
    if (user.profile.topLanguages.length > 0) score += 20;

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
        
        const mergedTags = Array.from(new Set([
            ...existingProfile.skillTags, 
            ...normalizedNewTags
        ]));

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

        // Rebuild the Vector with the NEW LC rating, but existing tags and CF rating
        const newVector = buildSkillVector({
            skillTags: existingProfile.skillTags,
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
                leetcodeLastSyncedAt: new Date(),
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
