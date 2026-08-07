import prismaClient from "db/client";
import { calculateProfileScore, type IntentState } from "@devmatch/shared";
import { intentService } from "./intent.service";

export type ReadinessAction = "CONNECT_GITHUB" | "CONNECT_LEETCODE" | "CONNECT_CODEFORCES" | "ADD_SKILLS" | "COMPLETE_INTENT";

export interface MatchReadiness {
  profileScore: number;
  isMatchReady: boolean;
  technicalSignalReady: boolean;
  vectorReady: boolean;
  activeIntentReady: boolean;
  githubUsable: boolean;
  leetcodeSynced: boolean;
  codeforcesSynced: boolean;
  blockers: string[];
  recommendedActions: ReadinessAction[];
  activeIntent: IntentState["searchIntentType"];
}

function githubUsable(profile: { githubUsername: string | null; githubLastSyncedAt: Date | null; topLanguages: string[]; githubTopics: string[]; githubContributions: unknown }) {
  return Boolean(profile.githubUsername && profile.githubLastSyncedAt && (
    profile.topLanguages.length > 0 || profile.githubTopics.length > 0 || Array.isArray(profile.githubContributions)
  ));
}

export const matchReadinessService = {
  async get(userId: string): Promise<MatchReadiness> {
    const [user, intentState] = await Promise.all([
      prismaClient.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      intentService.getIntentState(userId),
    ]);
    const profile = user?.profile;
    if (!user || !profile) {
      return {
        profileScore: 0, isMatchReady: false, technicalSignalReady: false, vectorReady: false,
        activeIntentReady: false, githubUsable: false, leetcodeSynced: false, codeforcesSynced: false,
        blockers: ["Create your developer profile to start matching."],
        recommendedActions: ["CONNECT_GITHUB", "ADD_SKILLS", "COMPLETE_INTENT"], activeIntent: null,
      };
    }
    const github = githubUsable(profile);
    const leetcode = Boolean(profile.leetcodeLastSyncedAt);
    const codeforces = Boolean(profile.codeforcesLastSyncedAt);
    const technicalSignalReady = profile.skillTags.length >= 3 || github || leetcode || codeforces;
    const vectorReady = profile.skillVector.length > 0 && !profile.skillVector.every((value) => value === 0);
    const activeIntentReady = Boolean(intentState.searchIntent?.completeness.offerComplete && intentState.searchIntent.completeness.searchComplete);
    const activeIntent = intentState.searchIntentType;
    const blockers: string[] = [];
    const actions: ReadinessAction[] = [];
    if (!technicalSignalReady || !vectorReady) {
      blockers.push("Add technical evidence before we can build your matching profile.");
      if (!github) actions.push("CONNECT_GITHUB");
      if (!leetcode) actions.push("CONNECT_LEETCODE");
      if (!codeforces) actions.push("CONNECT_CODEFORCES");
      actions.push("ADD_SKILLS");
    }
    if (!activeIntentReady) {
      blockers.push("Choose what you can offer and what you are looking for.");
      actions.push("COMPLETE_INTENT");
    }
    if (activeIntent === "OPENSOURCE" && !github) {
      blockers.push("Open Source matching requires synced GitHub data.");
      if (!actions.includes("CONNECT_GITHUB")) actions.unshift("CONNECT_GITHUB");
    }
    const isMatchReady = technicalSignalReady && vectorReady && activeIntentReady && (activeIntent !== "OPENSOURCE" || github);
    const profileScore = calculateProfileScore({
      displayName: user.displayName, bio: user.bio, college: user.college, skillCount: profile.skillTags.length,
      githubUsable: github, leetcodeSynced: leetcode, codeforcesSynced: codeforces, activeIntentComplete: activeIntentReady,
    });
    return { profileScore, isMatchReady, technicalSignalReady, vectorReady, activeIntentReady, githubUsable: github, leetcodeSynced: leetcode, codeforcesSynced: codeforces, blockers, recommendedActions: [...new Set(actions)], activeIntent };
  },

  async recomputeScore(userId: string) {
    const readiness = await this.get(userId);
    await prismaClient.profile.update({ where: { userId }, data: { profileScore: readiness.profileScore } });
    return readiness;
  },
};
