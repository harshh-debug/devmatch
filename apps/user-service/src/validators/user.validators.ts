import { z } from 'zod';

export const updateMeSchema = z.object({
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

export const setIntentSchema = z.object({
  intentType: z.enum(['DSA', 'HACKATHON', 'PROJECT', 'OPENSOURCE']),
  ratingMin: z.number().min(0).optional(),
  ratingMax: z.number().max(4000).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  preferredDomains: z.array(z.string()).optional(),
});

export const connectPlatformSchema = z.object({
  handle: z.string().trim().min(1, "Handle cannot be empty"),
});