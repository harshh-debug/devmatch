import { prismaClient } from "db/client";
import { skillTagMapper } from "./skillTagMapper";
import { buildSkillVector } from "@devmatch/shared";

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

        return await prismaClient.profile.update({
            where: { userId },
            data: {
                githubStars: fetchedData.githubStars,
                contributionStreak: fetchedData.contributionStreak,
                topLanguages: fetchedData.topLanguages,
                skillTags: mergedTags,
                skillVector: newVector, 
                lastSyncedAt: new Date(),
            }
        });
    },

    async updateLeetCodeStats(userId: string, fetchedData: { lcRating: number }) {
        const existingProfile = await prismaClient.profile.findUnique({
            where: { userId },
            select: { skillTags: true, cfRating: true }
        });

        if (!existingProfile) throw new Error("Profile not found");

        // Rebuild the Vector with the NEW LC rating, but existing tags and CF rating
        const newVector = buildSkillVector({
            skillTags: existingProfile.skillTags,
            lcRating: fetchedData.lcRating, // <-- New data
            cfRating: existingProfile.cfRating
        });

        return await prismaClient.profile.update({
            where: { userId },
            data: {
                lcRating: fetchedData.lcRating,
                skillVector: newVector,
                lastSyncedAt: new Date(),
            }
        });
    },

    async updateCodeforcesStats(userId: string, fetchedData: { cfRating: number }) {
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

        return await prismaClient.profile.update({
            where: { userId },
            data: {
                cfRating: fetchedData.cfRating,
                skillVector: newVector,
                lastSyncedAt: new Date(),
            }
        });
    }
};