import { z } from 'zod';
import {
  COLLABORATION_MODES,
  COLLABORATION_ROLES,
  DSA_GOALS,
  DSA_PROVIDER_PREFERENCES,
  INTENT_TYPES,
  OPEN_SOURCE_CONTRIBUTION_TYPES,
  SKILL_DOMAINS,
  SKILL_FRAMEWORKS,
  SKILL_LANGUAGES,
} from '@devmatch/shared';

export const updateMeSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  college: z.string().optional(),
  availability: z.enum(['ACTIVE', 'OPEN', 'BUSY']).optional(),
});

export const updateSkillsSchema = z.object({
  skillTags: z.array(z.string()).max(20).optional(),
  leetcodeHandle: z.string().optional(),
  codeforcesHandle: z.string().optional(),
  githubUsername: z.string().optional(),
});

export const intentTypeSchema = z.enum(INTENT_TYPES);
const languageSchema = z.enum(SKILL_LANGUAGES);
const frameworkSchema = z.enum(SKILL_FRAMEWORKS);
const domainSchema = z.enum(SKILL_DOMAINS);
const roleSchema = z.enum(COLLABORATION_ROLES);
const dsaGoalSchema = z.enum(DSA_GOALS);
const contributionTypeSchema = z.enum(OPEN_SOURCE_CONTRIBUTION_TYPES);
const topicSchema = z.string().trim().min(1).max(50);

const values = <T extends z.ZodType>(schema: T) => z.array(schema).max(20).default([]);

const dsaConfigurationSchema = z.object({
  intentType: z.literal('DSA'),
  offer: z.object({
    languages: values(languageSchema),
    goals: values(dsaGoalSchema),
  }).strict(),
  search: z.object({
    requiredLanguages: values(languageSchema),
    requiredGoals: values(dsaGoalSchema),
    niceToHaveLanguages: values(languageSchema),
    niceToHaveGoals: values(dsaGoalSchema),
    providerPreference: z.enum(DSA_PROVIDER_PREFERENCES),
    codeforcesRatingMin: z.number().int().min(0).max(4000).optional(),
    codeforcesRatingMax: z.number().int().min(0).max(4000).optional(),
    leetcodeGlobalRankBest: z.number().int().positive().optional(),
    leetcodeGlobalRankWorst: z.number().int().positive().optional(),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  if (
    value.search.codeforcesRatingMin !== undefined &&
    value.search.codeforcesRatingMax !== undefined &&
    value.search.codeforcesRatingMin > value.search.codeforcesRatingMax
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['search', 'codeforcesRatingMax'],
      message: 'Codeforces maximum must be greater than or equal to the minimum',
    });
  }
  if (
    value.search.leetcodeGlobalRankBest !== undefined &&
    value.search.leetcodeGlobalRankWorst !== undefined &&
    value.search.leetcodeGlobalRankBest > value.search.leetcodeGlobalRankWorst
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['search', 'leetcodeGlobalRankWorst'],
      message: 'LeetCode worst rank must be greater than or equal to the best rank',
    });
  }
});

const buildOfferSchema = z.object({
  roles: values(roleSchema),
  languages: values(languageSchema),
  frameworks: values(frameworkSchema),
  domains: values(domainSchema),
}).strict();

const buildSearchSchema = z.object({
  collaborationMode: z.enum(COLLABORATION_MODES),
  requiredRoles: values(roleSchema),
  requiredLanguages: values(languageSchema),
  requiredFrameworks: values(frameworkSchema),
  requiredDomains: values(domainSchema),
  niceToHaveRoles: values(roleSchema),
  niceToHaveLanguages: values(languageSchema),
  niceToHaveFrameworks: values(frameworkSchema),
  niceToHaveDomains: values(domainSchema),
}).strict();

const projectConfigurationSchema = z.object({
  intentType: z.literal('PROJECT'),
  offer: buildOfferSchema,
  search: buildSearchSchema,
}).strict();

const hackathonConfigurationSchema = z.object({
  intentType: z.literal('HACKATHON'),
  offer: buildOfferSchema,
  search: buildSearchSchema,
}).strict();

const openSourceConfigurationSchema = z.object({
  intentType: z.literal('OPENSOURCE'),
  offer: z.object({
    languages: values(languageSchema),
    frameworks: values(frameworkSchema),
    domains: values(domainSchema),
    repositoryTopics: values(topicSchema),
    contributionTypes: values(contributionTypeSchema),
  }).strict(),
  search: z.object({
    requiredLanguages: values(languageSchema),
    requiredFrameworks: values(frameworkSchema),
    requiredDomains: values(domainSchema),
    requiredRepositoryTopics: values(topicSchema),
    requiredContributionTypes: values(contributionTypeSchema),
    niceToHaveLanguages: values(languageSchema),
    niceToHaveFrameworks: values(frameworkSchema),
    niceToHaveDomains: values(domainSchema),
    niceToHaveRepositoryTopics: values(topicSchema),
    niceToHaveContributionTypes: values(contributionTypeSchema),
  }).strict(),
}).strict();

export const intentConfigurationSchema = z.discriminatedUnion('intentType', [
  dsaConfigurationSchema,
  projectConfigurationSchema,
  hackathonConfigurationSchema,
  openSourceConfigurationSchema,
]);

export const putSearchIntentSchema = z.object({
  intentType: intentTypeSchema,
  configuration: intentConfigurationSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.configuration && value.configuration.intentType !== value.intentType) {
    ctx.addIssue({
      code: 'custom',
      path: ['configuration', 'intentType'],
      message: 'Configuration intent type must match the activated intent',
    });
  }
});

export const openToIntentsSchema = z.object({
  intentTypes: z.array(intentTypeSchema).max(4),
});

export const connectPlatformSchema = z.object({
  handle: z.string().trim().min(1, "Handle cannot be empty"),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
}).strict();
