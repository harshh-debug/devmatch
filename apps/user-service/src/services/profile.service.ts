import prismaClient from "db/client";
import type { Prisma } from 'db/client';

export const profileService = {
  async getProfileByUserId(userId: string) {
    return prismaClient.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });
  },

  async searchPublicProfiles(query: string, limit = 10) {
    return prismaClient.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { profile: true },
      orderBy: { username: "asc" },
      take: limit,
    });
  },

  async isUsernameAvailable(username: string, userId: string) {
    const existing = await prismaClient.user.findUnique({ where: { username } });
    return !existing || existing.id === userId;
  },

  async updateUser(userId: string, data: Prisma.UserUpdateInput) {
    // Prisma automatically ignores undefined fields, enabling clean partial updates
    return prismaClient.user.update({
      where: { id: userId },
      data
    });
  },

  async upsertProfile(userId: string, data: Omit<Prisma.ProfileCreateInput, 'user'>) {
    return prismaClient.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  },

  async updateSkillVector(userId: string, vector: number[]) {
    return prismaClient.profile.update({
      where: { userId },
      data: { skillVector: vector }
    });
  },

  async computeProfileScore(userId: string) {
    const user = await this.getProfileByUserId(userId);
    if (!user) return 0;

    let score = 0;
    
    // Core details
    if (user.displayName) score += 20;
    
    // Profile specific details
    if (user.profile) {
      if (user.profile.skillTags && user.profile.skillTags.length >= 3) score += 20;
      if (user.profile.githubUsername) score += 20;
      // Competitive-programming accounts are independent signals. Keeping
      // them separate means a profile without Codeforces cannot appear fully
      // complete simply because LeetCode is connected (or vice versa).
      if (user.profile.lcRating) score += 10;
      if (user.profile.cfRating) score += 10;
      if (user.profile.topLanguages && user.profile.topLanguages.length > 0) score += 20;
    }

    // Persist the computed score
    if (user.profile) {
      await prismaClient.profile.update({
        where: { userId },
        data: { profileScore: score }
      });
    }

    return score;
  }
};
