import crypto from "node:crypto";
import prismaClient, { type IntentType, type Prisma } from "db/client";
import {
  normalizePreferredDomains,
  normalizePreferredLanguages,
  type IntentPreferences,
  type IntentState,
  type MatchPreferencesUpdatedV1,
} from "@devmatch/shared";
import { TOPICS } from "@devmatch/kafka";

type SearchIntentInput = {
  intentType: IntentType;
  ratingMin?: number;
  ratingMax?: number;
  preferredLanguages?: string[];
  preferredDomains?: string[];
};

const intentOrder: Record<IntentType, number> = {
  DSA: 0,
  HACKATHON: 1,
  PROJECT: 2,
  OPENSOURCE: 3,
};

function toPreferences(intent: {
  intentType: IntentType;
  ratingMin: number | null;
  ratingMax: number | null;
  preferredLanguages: string[];
  preferredDomains: string[];
} | null): IntentPreferences | null {
  if (!intent) return null;
  return {
    intentType: intent.intentType,
    ...(intent.ratingMin !== null ? { ratingMin: intent.ratingMin } : {}),
    ...(intent.ratingMax !== null ? { ratingMax: intent.ratingMax } : {}),
    preferredLanguages: intent.preferredLanguages,
    preferredDomains: intent.preferredDomains,
  };
}

function buildState(user: {
  matchPreferencesRevision: number;
  searchIntent: {
    intentType: IntentType;
    ratingMin: number | null;
    ratingMax: number | null;
    preferredLanguages: string[];
    preferredDomains: string[];
  } | null;
  openToIntents: { intentType: IntentType }[];
}): IntentState {
  const searchIntent = toPreferences(user.searchIntent);
  const openToIntents = [...new Set(user.openToIntents.map((intent) => intent.intentType))]
    .sort((left, right) => intentOrder[left] - intentOrder[right]);
  const effectiveOpenToIntents = [...new Set([
    ...openToIntents,
    ...(searchIntent ? [searchIntent.intentType] : []),
  ])];

  return {
    searchIntent,
    openToIntents,
    effectiveOpenToIntents,
    revision: user.matchPreferencesRevision,
  };
}

async function readState(client: Prisma.TransactionClient | typeof prismaClient, userId: string) {
  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      matchPreferencesRevision: true,
      searchIntent: true,
      openToIntents: {
        select: { intentType: true },
        orderBy: { intentType: "asc" },
      },
    },
  });
  return buildState(user);
}

async function writePreferenceEvent(
  tx: Prisma.TransactionClient,
  userId: string,
  revision: number,
) {
  const eventId = crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const payload: MatchPreferencesUpdatedV1 = {
    eventId,
    schemaVersion: 1,
    eventType: "MATCH_PREFERENCES_UPDATED",
    userId,
    revision,
    occurredAt,
  };

  await tx.outboxEvent.create({
    data: {
      id: eventId,
      topic: TOPICS.MATCH_PREFERENCES_UPDATED,
      aggregateId: userId,
      eventType: payload.eventType,
      schemaVersion: payload.schemaVersion,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
}

async function mutatePreferences(
  userId: string,
  mutation: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  return prismaClient.$transaction(async (tx) => {
    await mutation(tx);
    const user = await tx.user.update({
      where: { id: userId },
      data: { matchPreferencesRevision: { increment: 1 } },
      select: { matchPreferencesRevision: true },
    });
    await writePreferenceEvent(tx, userId, user.matchPreferencesRevision);
    return readState(tx, userId);
  });
}

export const intentService = {
  async getIntentState(userId: string) {
    return readState(prismaClient, userId);
  },

  async getSearchIntent(userId: string) {
    return prismaClient.searchIntent.findUnique({ where: { userId } });
  },

  async setSearchIntent(userId: string, input: SearchIntentInput) {
    const isDsa = input.intentType === "DSA";
    const data = {
      intentType: input.intentType,
      ratingMin: isDsa ? input.ratingMin ?? null : null,
      ratingMax: isDsa ? input.ratingMax ?? null : null,
      preferredLanguages: normalizePreferredLanguages(input.preferredLanguages),
      preferredDomains: normalizePreferredDomains(input.preferredDomains),
    };

    return mutatePreferences(userId, async (tx) => {
      await tx.searchIntent.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
    });
  },

  async deleteSearchIntent(userId: string) {
    return mutatePreferences(userId, async (tx) => {
      await tx.searchIntent.deleteMany({ where: { userId } });
    });
  },

  async replaceOpenToIntents(userId: string, intentTypes: IntentType[]) {
    const deduplicated = [...new Set(intentTypes)];
    return mutatePreferences(userId, async (tx) => {
      await tx.openToIntent.deleteMany({ where: { userId } });
      if (deduplicated.length > 0) {
        await tx.openToIntent.createMany({
          data: deduplicated.map((intentType) => ({ userId, intentType })),
        });
      }
    });
  },
};
