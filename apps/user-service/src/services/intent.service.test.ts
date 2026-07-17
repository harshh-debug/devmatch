import { afterAll, describe, expect, it } from "bun:test";
import prismaClient from "db/client";
import { intentService } from "./intent.service";

const createdUserIds: string[] = [];

afterAll(async () => {
  await prismaClient.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe("directional intent persistence", () => {
  it("updates search and open-to independently, deduplicates, and keeps the implicit union", async () => {
    const suffix = crypto.randomUUID();
    const user = await prismaClient.user.create({
      data: {
        email: `intent-${suffix}@example.com`,
        username: `intent_${suffix.replaceAll("-", "").slice(0, 12)}`,
        displayName: "Intent Test",
      },
    });
    createdUserIds.push(user.id);

    const searched = await intentService.activateSearchIntent(user.id, "DSA", {
      intentType: "DSA",
      offer: {
        languages: ["cpp", "python"],
        goals: ["INTERVIEW_PREP"],
      },
      search: {
        requiredLanguages: ["cpp", "python"],
        requiredGoals: ["INTERVIEW_PREP"],
        niceToHaveLanguages: [],
        niceToHaveGoals: [],
        providerPreference: "EITHER",
      },
    });
    expect(searched.searchIntent?.intentType).toBe("DSA");
    expect(searched.configurations.DSA?.offer.languages).toEqual(["cpp", "python"]);
    expect(searched.openToIntents).toEqual([]);
    expect(searched.effectiveOpenToIntents).toEqual(["DSA"]);

    await intentService.saveIntentConfiguration(user.id, {
      intentType: "PROJECT",
      offer: {
        roles: ["FRONTEND"],
        languages: ["typescript"],
        frameworks: ["react"],
        domains: ["web"],
      },
      search: {
        collaborationMode: "SIMILAR",
        requiredRoles: ["FRONTEND"],
        requiredLanguages: ["typescript"],
        requiredFrameworks: [],
        requiredDomains: [],
        niceToHaveRoles: [],
        niceToHaveLanguages: [],
        niceToHaveFrameworks: [],
        niceToHaveDomains: [],
      },
    });
    const opened = await intentService.replaceOpenToIntents(user.id, [
      "PROJECT",
      "PROJECT",
    ]);
    expect(opened.searchIntent?.intentType).toBe("DSA");
    expect(opened.openToIntents).toEqual(["PROJECT"]);
    expect(new Set(opened.effectiveOpenToIntents)).toEqual(
      new Set(["DSA", "PROJECT"]),
    );
    expect(opened.revision).toBe(searched.revision + 2);

    const passive = await intentService.deleteSearchIntent(user.id);
    expect(passive.searchIntent).toBeNull();
    expect(passive.effectiveOpenToIntents).toEqual(passive.openToIntents);
    expect(passive.effectiveOpenToIntents).toContain("PROJECT");

    const outboxRows = await prismaClient.outboxEvent.count({
      where: { aggregateId: user.id },
    });
    expect(outboxRows).toBe(4);
  });
});
