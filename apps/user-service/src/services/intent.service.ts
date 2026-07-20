import crypto from "node:crypto";
import prismaClient, {
  type IntentConfiguration as DbIntentConfiguration,
  type IntentType as DbIntentType,
  type Prisma,
  type Profile,
} from "db/client";
import {
  classifyCanonicalSkills,
  deriveRoleEvidence,
  evaluateConfigurationCompleteness,
  normalizeDomains,
  normalizeFrameworks,
  normalizeLanguages,
  normalizeRepositoryTopics,
  type CapabilityEvidence,
  type IntentConfiguration,
  type IntentConfigurationInput,
  type IntentConfigurationMetadata,
  type IntentState,
  type IntentType,
  type MatchPreferencesUpdatedV1,
  type VerifiedCapabilities,
} from "@devmatch/shared";
import { TOPICS } from "@devmatch/kafka";

const intentOrder: Record<IntentType, number> = {
  DSA: 0,
  HACKATHON: 1,
  PROJECT: 2,
  OPENSOURCE: 3,
};

export class IntentConfigurationError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "IntentConfigurationError";
  }
}

function parseContributionCalendar(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((week) =>
    Boolean(
      week &&
      typeof week === "object" &&
      "days" in week &&
      Array.isArray(week.days) &&
      week.days.some((day: unknown) =>
        Boolean(day && typeof day === "object" && "count" in day),
      ),
    ),
  );
}

function profileContext(profile: Profile | null) {
  const source = classifyCanonicalSkills([
    ...(profile?.topLanguages ?? []),
    ...(profile?.githubTopics ?? []),
  ]);
  const verifiedCapabilities: VerifiedCapabilities = {
    languages: source.languages,
    frameworks: source.frameworks,
    domains: source.domains,
    repositoryTopics: normalizeRepositoryTopics(profile?.githubTopics),
  };
  const githubUsable = Boolean(
    profile?.githubUsername &&
    profile.githubLastSyncedAt &&
    (source.all.length > 0 || parseContributionCalendar(profile.githubContributions)),
  );
  return { verifiedCapabilities, githubUsable };
}

function deduplicate<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeConfiguration(input: IntentConfigurationInput): IntentConfigurationInput {
  if (input.intentType === "DSA") {
    return {
      intentType: "DSA",
      offer: {
        languages: normalizeLanguages(input.offer.languages),
        goals: deduplicate(input.offer.goals),
      },
      search: {
        requiredLanguages: normalizeLanguages(input.search.requiredLanguages),
        requiredGoals: deduplicate(input.search.requiredGoals),
        niceToHaveLanguages: normalizeLanguages(input.search.niceToHaveLanguages),
        niceToHaveGoals: deduplicate(input.search.niceToHaveGoals),
        providerPreference: input.search.providerPreference,
        ...(input.search.codeforcesRatingMin !== undefined
          ? { codeforcesRatingMin: input.search.codeforcesRatingMin }
          : {}),
        ...(input.search.codeforcesRatingMax !== undefined
          ? { codeforcesRatingMax: input.search.codeforcesRatingMax }
          : {}),
        ...(input.search.leetcodeGlobalRankBest !== undefined
          ? { leetcodeGlobalRankBest: input.search.leetcodeGlobalRankBest }
          : {}),
        ...(input.search.leetcodeGlobalRankWorst !== undefined
          ? { leetcodeGlobalRankWorst: input.search.leetcodeGlobalRankWorst }
          : {}),
      },
    };
  }

  if (input.intentType === "PROJECT" || input.intentType === "HACKATHON") {
    return {
      intentType: input.intentType,
      offer: {
        roles: deduplicate(input.offer.roles),
        languages: normalizeLanguages(input.offer.languages),
        frameworks: normalizeFrameworks(input.offer.frameworks),
        domains: normalizeDomains(input.offer.domains),
      },
      search: {
        collaborationMode: input.search.collaborationMode,
        requiredRoles: deduplicate(input.search.requiredRoles),
        requiredLanguages: normalizeLanguages(input.search.requiredLanguages),
        requiredFrameworks: normalizeFrameworks(input.search.requiredFrameworks),
        requiredDomains: normalizeDomains(input.search.requiredDomains),
        // Project/Hackathon no longer expose or use nice-to-have filters.
        niceToHaveRoles: [],
        niceToHaveLanguages: [],
        niceToHaveFrameworks: [],
        niceToHaveDomains: [],
      },
    };
  }

  return {
    intentType: "OPENSOURCE",
    offer: {
      languages: normalizeLanguages(input.offer.languages),
      frameworks: normalizeFrameworks(input.offer.frameworks),
      domains: normalizeDomains(input.offer.domains),
      repositoryTopics: normalizeRepositoryTopics(input.offer.repositoryTopics),
      contributionTypes: deduplicate(input.offer.contributionTypes),
    },
    search: {
      requiredLanguages: normalizeLanguages(input.search.requiredLanguages),
      requiredFrameworks: normalizeFrameworks(input.search.requiredFrameworks),
      requiredDomains: normalizeDomains(input.search.requiredDomains),
      requiredRepositoryTopics: normalizeRepositoryTopics(input.search.requiredRepositoryTopics),
      requiredContributionTypes: deduplicate(input.search.requiredContributionTypes),
      niceToHaveLanguages: normalizeLanguages(input.search.niceToHaveLanguages),
      niceToHaveFrameworks: normalizeFrameworks(input.search.niceToHaveFrameworks),
      niceToHaveDomains: normalizeDomains(input.search.niceToHaveDomains),
      niceToHaveRepositoryTopics: normalizeRepositoryTopics(input.search.niceToHaveRepositoryTopics),
      niceToHaveContributionTypes: deduplicate(input.search.niceToHaveContributionTypes),
    },
  };
}

function rowToInput(row: DbIntentConfiguration): IntentConfigurationInput {
  if (row.intentType === "DSA") {
    return {
      intentType: "DSA",
      offer: {
        languages: row.offeredLanguages,
        goals: row.offeredDsaGoals,
      },
      search: {
        requiredLanguages: row.requiredLanguages,
        requiredGoals: row.requiredDsaGoals,
        niceToHaveLanguages: row.niceToHaveLanguages,
        niceToHaveGoals: row.niceToHaveDsaGoals,
        providerPreference: row.dsaProviderPreference ?? "EITHER",
        ...(row.codeforcesRatingMin !== null
          ? { codeforcesRatingMin: row.codeforcesRatingMin }
          : {}),
        ...(row.codeforcesRatingMax !== null
          ? { codeforcesRatingMax: row.codeforcesRatingMax }
          : {}),
        ...(row.leetcodeGlobalRankBest !== null
          ? { leetcodeGlobalRankBest: row.leetcodeGlobalRankBest }
          : {}),
        ...(row.leetcodeGlobalRankWorst !== null
          ? { leetcodeGlobalRankWorst: row.leetcodeGlobalRankWorst }
          : {}),
      },
    };
  }

  if (row.intentType === "PROJECT" || row.intentType === "HACKATHON") {
    return {
      intentType: row.intentType,
      offer: {
        roles: row.offeredRoles,
        languages: row.offeredLanguages,
        frameworks: row.offeredFrameworks,
        domains: row.offeredDomains,
      },
      search: {
        collaborationMode: row.collaborationMode ?? "EITHER",
        requiredRoles: row.requiredRoles,
        requiredLanguages: row.requiredLanguages,
        requiredFrameworks: row.requiredFrameworks,
        requiredDomains: row.requiredDomains,
        niceToHaveRoles: row.niceToHaveRoles,
        niceToHaveLanguages: row.niceToHaveLanguages,
        niceToHaveFrameworks: row.niceToHaveFrameworks,
        niceToHaveDomains: row.niceToHaveDomains,
      },
    };
  }

  return {
    intentType: "OPENSOURCE",
    offer: {
      languages: row.offeredLanguages,
      frameworks: row.offeredFrameworks,
      domains: row.offeredDomains,
      repositoryTopics: row.offeredRepositoryTopics,
      contributionTypes: row.offeredContributionTypes,
    },
    search: {
      requiredLanguages: row.requiredLanguages,
      requiredFrameworks: row.requiredFrameworks,
      requiredDomains: row.requiredDomains,
      requiredRepositoryTopics: row.requiredRepositoryTopics,
      requiredContributionTypes: row.requiredContributionTypes,
      niceToHaveLanguages: row.niceToHaveLanguages,
      niceToHaveFrameworks: row.niceToHaveFrameworks,
      niceToHaveDomains: row.niceToHaveDomains,
      niceToHaveRepositoryTopics: row.niceToHaveRepositoryTopics,
      niceToHaveContributionTypes: row.niceToHaveContributionTypes,
    },
  };
}

function selectedEvidence(
  input: IntentConfigurationInput,
  verified: VerifiedCapabilities,
): CapabilityEvidence[] {
  if (input.intentType === "DSA") return [];
  const evidence: CapabilityEvidence[] = [];
  const add = (
    category: CapabilityEvidence["category"],
    values: readonly string[],
    verifiedValues: readonly string[],
  ) => {
    const verifiedSet = new Set(verifiedValues);
    for (const value of values) {
      evidence.push({
        category,
        value,
        source: verifiedSet.has(value) ? "VERIFIED" : "SELF_REPORTED",
      });
    }
  };

  if (input.intentType === "PROJECT" || input.intentType === "HACKATHON") {
    evidence.push(...deriveRoleEvidence(input.offer.roles, verified));
  }
  add("LANGUAGE", input.offer.languages, verified.languages);
  add("FRAMEWORK", input.offer.frameworks, verified.frameworks);
  add("DOMAIN", input.offer.domains, verified.domains);
  if (input.intentType === "OPENSOURCE") {
    add("TOPIC", input.offer.repositoryTopics, verified.repositoryTopics);
  }
  return evidence;
}

function toConfiguration(
  row: DbIntentConfiguration,
  profile: Profile | null,
): IntentConfiguration {
  const input = rowToInput(row);
  const context = profileContext(profile);
  const metadata: IntentConfigurationMetadata = {
    availableVerifiedCapabilities: context.verifiedCapabilities,
    offerEvidence: selectedEvidence(input, context.verifiedCapabilities),
  };
  return {
    ...input,
    completeness: evaluateConfigurationCompleteness(input, context),
    metadata,
    updatedAt: row.updatedAt.toISOString(),
  } as IntentConfiguration;
}

function configurationData(input: IntentConfigurationInput): Prisma.IntentConfigurationUncheckedCreateInput {
  const base: Prisma.IntentConfigurationUncheckedCreateInput = {
    userId: "",
    intentType: input.intentType as DbIntentType,
    offeredLanguages: [],
    offeredFrameworks: [],
    offeredDomains: [],
    offeredRoles: [],
    offeredDsaGoals: [],
    offeredContributionTypes: [],
    offeredRepositoryTopics: [],
    requiredLanguages: [],
    requiredFrameworks: [],
    requiredDomains: [],
    requiredRoles: [],
    requiredDsaGoals: [],
    requiredContributionTypes: [],
    requiredRepositoryTopics: [],
    niceToHaveLanguages: [],
    niceToHaveFrameworks: [],
    niceToHaveDomains: [],
    niceToHaveRoles: [],
    niceToHaveDsaGoals: [],
    niceToHaveContributionTypes: [],
    niceToHaveRepositoryTopics: [],
    collaborationMode: null,
    dsaProviderPreference: null,
    codeforcesRatingMin: null,
    codeforcesRatingMax: null,
    leetcodeGlobalRankBest: null,
    leetcodeGlobalRankWorst: null,
  };

  if (input.intentType === "DSA") {
    return {
      ...base,
      offeredLanguages: input.offer.languages,
      offeredDsaGoals: input.offer.goals,
      requiredLanguages: input.search.requiredLanguages,
      requiredDsaGoals: input.search.requiredGoals,
      niceToHaveLanguages: input.search.niceToHaveLanguages,
      niceToHaveDsaGoals: input.search.niceToHaveGoals,
      dsaProviderPreference: input.search.providerPreference,
      codeforcesRatingMin: input.search.codeforcesRatingMin ?? null,
      codeforcesRatingMax: input.search.codeforcesRatingMax ?? null,
      leetcodeGlobalRankBest: input.search.leetcodeGlobalRankBest ?? null,
      leetcodeGlobalRankWorst: input.search.leetcodeGlobalRankWorst ?? null,
    };
  }
  if (input.intentType === "PROJECT" || input.intentType === "HACKATHON") {
    return {
      ...base,
      offeredLanguages: input.offer.languages,
      offeredFrameworks: input.offer.frameworks,
      offeredDomains: input.offer.domains,
      offeredRoles: input.offer.roles,
      requiredLanguages: input.search.requiredLanguages,
      requiredFrameworks: input.search.requiredFrameworks,
      requiredDomains: input.search.requiredDomains,
      requiredRoles: input.search.requiredRoles,
      niceToHaveLanguages: input.search.niceToHaveLanguages,
      niceToHaveFrameworks: input.search.niceToHaveFrameworks,
      niceToHaveDomains: input.search.niceToHaveDomains,
      niceToHaveRoles: input.search.niceToHaveRoles,
      collaborationMode: input.search.collaborationMode,
    };
  }
  return {
    ...base,
    offeredLanguages: input.offer.languages,
    offeredFrameworks: input.offer.frameworks,
    offeredDomains: input.offer.domains,
    offeredRepositoryTopics: input.offer.repositoryTopics,
    offeredContributionTypes: input.offer.contributionTypes,
    requiredLanguages: input.search.requiredLanguages,
    requiredFrameworks: input.search.requiredFrameworks,
    requiredDomains: input.search.requiredDomains,
    requiredRepositoryTopics: input.search.requiredRepositoryTopics,
    requiredContributionTypes: input.search.requiredContributionTypes,
    niceToHaveLanguages: input.search.niceToHaveLanguages,
    niceToHaveFrameworks: input.search.niceToHaveFrameworks,
    niceToHaveDomains: input.search.niceToHaveDomains,
    niceToHaveRepositoryTopics: input.search.niceToHaveRepositoryTopics,
    niceToHaveContributionTypes: input.search.niceToHaveContributionTypes,
  };
}

function assertOpenSourceSelections(
  input: IntentConfigurationInput,
  profile: Profile | null,
) {
  if (input.intentType !== "OPENSOURCE") return;
  const { verifiedCapabilities } = profileContext(profile);
  const invalid = [
    ...input.offer.languages.filter((value) => !verifiedCapabilities.languages.includes(value)),
    ...input.offer.frameworks.filter((value) => !verifiedCapabilities.frameworks.includes(value)),
    ...input.offer.domains.filter((value) => !verifiedCapabilities.domains.includes(value)),
    ...input.offer.repositoryTopics.filter(
      (value) => !verifiedCapabilities.repositoryTopics.includes(value),
    ),
  ];
  if (invalid.length > 0) {
    throw new IntentConfigurationError(
      409,
      "UNVERIFIED_OPEN_SOURCE_CAPABILITY",
      "Open Source technical capabilities must be verified by GitHub.",
      { values: deduplicate(invalid) },
    );
  }
}

async function upsertConfiguration(
  tx: Prisma.TransactionClient,
  userId: string,
  rawInput: IntentConfigurationInput,
) {
  const input = normalizeConfiguration(rawInput);
  const profile = await tx.profile.findUnique({ where: { userId } });
  assertOpenSourceSelections(input, profile);
  const data = configurationData(input);
  const { userId: ignoredUserId, intentType: ignoredIntentType, ...update } = data;
  return tx.intentConfiguration.upsert({
    where: { userId_intentType: { userId, intentType: input.intentType as DbIntentType } },
    create: { ...data, userId },
    update,
  });
}

async function readState(client: Prisma.TransactionClient | typeof prismaClient, userId: string) {
  const user = await client.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      matchPreferencesRevision: true,
      profile: true,
      searchIntent: true,
      intentConfigurations: { orderBy: { intentType: "asc" } },
      openToIntents: {
        select: { intentType: true },
        orderBy: { intentType: "asc" },
      },
    },
  });

  const configurations = Object.fromEntries(
    user.intentConfigurations.map((row) => [
      row.intentType,
      toConfiguration(row, user.profile),
    ]),
  ) as Partial<Record<IntentType, IntentConfiguration>>;
  const searchIntentType = user.searchIntent?.intentType ?? null;
  const searchIntent = searchIntentType ? configurations[searchIntentType] ?? null : null;
  const openToIntents = deduplicate(
    user.openToIntents.map((intent) => intent.intentType as IntentType),
  ).sort((left, right) => intentOrder[left] - intentOrder[right]);
  const selectedInbound = deduplicate([
    ...openToIntents,
    ...(searchIntentType ? [searchIntentType] : []),
  ]);
  const effectiveOpenToIntents = selectedInbound
    .filter((intentType) => configurations[intentType]?.completeness.offerComplete)
    .sort((left, right) => intentOrder[left] - intentOrder[right]);

  return {
    searchIntent,
    searchIntentType,
    configurations,
    openToIntents,
    effectiveOpenToIntents,
    revision: user.matchPreferencesRevision,
  } satisfies IntentState;
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

function requireOffer(
  configuration: IntentConfiguration | undefined,
  intentType: IntentType,
): asserts configuration is IntentConfiguration {
  if (!configuration?.completeness.offerComplete) {
    const githubRequired = configuration?.completeness.offerIssues.includes("offer.githubData");
    throw new IntentConfigurationError(
      409,
      githubRequired ? "GITHUB_DATA_REQUIRED" : "INTENT_OFFER_CONFIGURATION_REQUIRED",
      githubRequired
        ? "Usable GitHub data is required for Open Source matching."
        : "Complete the offer profile before enabling this intent.",
      {
        intentType,
        issues: configuration?.completeness.offerIssues ?? ["configuration.missing"],
      },
    );
  }
}

export const intentService = {
  async getIntentState(userId: string) {
    return readState(prismaClient, userId);
  },

  async getSearchIntent(userId: string) {
    return prismaClient.searchIntent.findUnique({ where: { userId } });
  },

  async saveIntentConfiguration(userId: string, input: IntentConfigurationInput) {
    return mutatePreferences(userId, async (tx) => {
      const row = await upsertConfiguration(tx, userId, input);
      const profile = await tx.profile.findUnique({ where: { userId } });
      const configuration = toConfiguration(row, profile);
      if (!configuration.completeness.offerComplete || !configuration.completeness.searchComplete) {
        const selected = await Promise.all([
          tx.searchIntent.findUnique({ where: { userId } }),
          tx.openToIntent.findUnique({
            where: {
              userId_intentType: {
                userId,
                intentType: input.intentType as DbIntentType,
              },
            },
          }),
        ]);
        if (
          selected[0]?.intentType === input.intentType ||
          (selected[1] && !configuration.completeness.offerComplete)
        ) {
          throw new IntentConfigurationError(
            409,
            "CONFIGURATION_WOULD_DISABLE_ACTIVE_INTENT",
            "This configuration is currently active or open to matching and cannot be made incomplete.",
            {
              intentType: input.intentType,
              offerIssues: configuration.completeness.offerIssues,
              searchIssues: configuration.completeness.searchIssues,
            },
          );
        }
      }
    });
  },

  async activateSearchIntent(
    userId: string,
    intentType: IntentType,
    configuration?: IntentConfigurationInput,
  ) {
    return mutatePreferences(userId, async (tx) => {
      if (configuration) {
        if (configuration.intentType !== intentType) {
          throw new IntentConfigurationError(
            400,
            "INTENT_TYPE_MISMATCH",
            "Configuration intent type does not match the activated intent.",
          );
        }
        await upsertConfiguration(tx, userId, configuration);
      }
      const [row, profile] = await Promise.all([
        tx.intentConfiguration.findUnique({
          where: {
            userId_intentType: { userId, intentType: intentType as DbIntentType },
          },
        }),
        tx.profile.findUnique({ where: { userId } }),
      ]);
      const resolved = row ? toConfiguration(row, profile) : undefined;
      requireOffer(resolved, intentType);
      if (!resolved.completeness.searchComplete) {
        throw new IntentConfigurationError(
          409,
          "INTENT_SEARCH_CONFIGURATION_REQUIRED",
          "Complete the search preferences before activating this intent.",
          { intentType, issues: resolved.completeness.searchIssues },
        );
      }
      await tx.searchIntent.upsert({
        where: { userId },
        create: { userId, intentType: intentType as DbIntentType },
        update: { intentType: intentType as DbIntentType },
      });
    });
  },

  async deleteSearchIntent(userId: string) {
    return mutatePreferences(userId, async (tx) => {
      await tx.searchIntent.deleteMany({ where: { userId } });
    });
  },

  async replaceOpenToIntents(userId: string, intentTypes: IntentType[]) {
    const deduplicated = deduplicate(intentTypes);
    return mutatePreferences(userId, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { profile: true, intentConfigurations: true },
      });
      const configurations = Object.fromEntries(
        user.intentConfigurations.map((row) => [
          row.intentType,
          toConfiguration(row, user.profile),
        ]),
      ) as Partial<Record<IntentType, IntentConfiguration>>;
      const incomplete: IntentType[] = [];
      for (const intentType of deduplicated) {
        if (!configurations[intentType]?.completeness.offerComplete) incomplete.push(intentType);
      }
      if (incomplete.length > 0) {
        throw new IntentConfigurationError(
          409,
          "INTENT_OFFER_CONFIGURATION_REQUIRED",
          "Complete the offer profile before enabling this intent.",
          { intentTypes: incomplete },
        );
      }
      await tx.openToIntent.deleteMany({ where: { userId } });
      if (deduplicated.length > 0) {
        await tx.openToIntent.createMany({
          data: deduplicated.map((intentType) => ({
            userId,
            intentType: intentType as DbIntentType,
          })),
        });
      }
    });
  },
};
