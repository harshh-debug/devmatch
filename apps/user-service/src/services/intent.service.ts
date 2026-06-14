import  prismaClient  from 'db/client';
import type { Prisma } from 'db/client';

export const intentService = {
  async getActiveIntent(userId: string) {
    return prismaClient.matchIntent.findFirst({
      where: { userId, active: true }
    });
  },

  async setIntent(userId: string, intentData: Omit<Prisma.MatchIntentUncheckedCreateInput, 'userId' | 'active'>) {
    // Deactivate all existing active intents for this user
    const deactivate = prismaClient.matchIntent.updateMany({
      where: { userId, active: true },
      data: { active: false }
    });

    // Create the new active intent
    const create = prismaClient.matchIntent.create({
      data: { userId, ...intentData, active: true }
    });

    // Execute both operations in a single atomic transaction
    const [_, newIntent] = await prismaClient.$transaction([deactivate, create]);
    return newIntent;
  },

  async deleteIntent(userId: string) {
    return prismaClient.matchIntent.updateMany({
      where: { userId, active: true },
      data: { active: false }
    });
  }
};