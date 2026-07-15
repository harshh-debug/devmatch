import { prismaClient } from "../index.ts";
import { buildSkillVector, normalizeSkillTags } from "@devmatch/shared";

/**
 * Rebuilds every stored vector using the current canonical feature schema.
 * Safe for existing development data: it preserves profiles, interactions, and
 * platform metrics while replacing only `skillTags` and `skillVector`.
 */
async function main() {
  const profiles = await prismaClient.profile.findMany({
    select: { userId: true, skillTags: true, lcRating: true, cfRating: true },
  });

  await prismaClient.$transaction(
    profiles.map((profile) => {
      const skillTags = normalizeSkillTags(profile.skillTags);
      const skillVector = buildSkillVector({
        skillTags,
        lcRating: profile.lcRating,
        cfRating: profile.cfRating,
      });
      return prismaClient.profile.update({
        where: { userId: profile.userId },
        data: { skillTags, skillVector },
      });
    }),
  );

  console.log(`Rebuilt ${profiles.length} skill vectors.`);
}

main()
  .catch((error) => {
    console.error("Vector backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prismaClient.$disconnect());
