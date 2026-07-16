import prismaClient, { ActionType, IntentType, type MatchAction } from "db/client";
import { markAsSeen, reconstructMatchProfile } from "./cache/vectorCache";
import { evaluateRecommendation } from "./engine/ranker";
import type { RecommendationSnapshot } from "./engine/types";
import { publishMatchAccepted, publishMatchRejected } from "./kafka/producer";

export class MatchActionError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface MatchActionResult {
  action: ActionType;
  isMutual: boolean;
  matchId: string | null;
}

function snapshotData(snapshot: RecommendationSnapshot | null) {
  return snapshot
    ? {
        similarityScore: snapshot.similarityScore,
        compatibility: snapshot.compatibility,
        levelSource: snapshot.levelSource,
        matchTier: snapshot.matchTier,
        matchedSkills: snapshot.matchedSkills,
        matchedLanguages: snapshot.matchedLanguages,
        matchedDomains: snapshot.matchedDomains,
        explanation: snapshot.explanation,
      }
    : {
        similarityScore: null,
        compatibility: null,
        levelSource: null,
        matchTier: null,
        matchedSkills: [],
        matchedLanguages: [],
        matchedDomains: [],
        explanation: undefined,
      };
}

function snapshotFromAction(action: MatchAction): RecommendationSnapshot | null {
  if (
    action.similarityScore === null ||
    action.compatibility === null ||
    action.levelSource === null ||
    action.matchTier === null
  ) {
    return null;
  }
  return {
    similarityScore: action.similarityScore,
    compatibility: action.compatibility,
    levelSource: action.levelSource,
    matchTier: action.matchTier,
    matchedSkills: action.matchedSkills,
    matchedLanguages: action.matchedLanguages,
    matchedDomains: action.matchedDomains,
    explanation: {
      intentType: action.intentType,
      compatibility: action.compatibility,
      levelSource: action.levelSource,
      matchTier: action.matchTier,
    },
  };
}

async function computeActionSnapshot(
  actorId: string,
  targetId: string,
  intentType: IntentType,
  incomingAction: MatchAction | null,
) {
  if (incomingAction?.action === "ACCEPTED") {
    return snapshotFromAction(incomingAction);
  }

  const [actor, target] = await Promise.all([
    reconstructMatchProfile(actorId),
    reconstructMatchProfile(targetId),
  ]);
  if (!actor?.searchIntent || actor.searchIntent.intentType !== intentType) {
    throw new MatchActionError(
      409,
      "SEARCH_INTENT_CHANGED",
      "Your current search intent no longer matches this candidate.",
    );
  }
  if (!target) {
    throw new MatchActionError(
      409,
      "CANDIDATE_NO_LONGER_ELIGIBLE",
      "This candidate is no longer eligible.",
    );
  }
  const evaluated = evaluateRecommendation(actor, target, intentType);
  if (!evaluated) {
    throw new MatchActionError(
      409,
      "CANDIDATE_NO_LONGER_ELIGIBLE",
      "This candidate is no longer eligible.",
    );
  }
  return evaluated.snapshot;
}

export async function processMatchAction(
  actorId: string,
  targetId: string,
  action: ActionType,
  intentType: IntentType,
): Promise<MatchActionResult> {
  const incomingAction = await prismaClient.matchAction.findUnique({
    where: {
      actorId_targetId_intentType: {
        actorId: targetId,
        targetId: actorId,
        intentType,
      },
    },
  });
  const snapshot = await computeActionSnapshot(actorId, targetId, intentType, incomingAction);

  const completingAction = await prismaClient.matchAction.upsert({
    where: {
      actorId_targetId_intentType: { actorId, targetId, intentType },
    },
    create: {
      actorId,
      targetId,
      action,
      intentType,
      ...snapshotData(snapshot),
    },
    update: {
      action,
      ...snapshotData(snapshot),
    },
  });

  void markAsSeen(actorId, targetId, intentType).catch((error) =>
    console.error(`[Redis] Failed to mark ${targetId} as seen by ${actorId}`, error),
  );

  if (action === "REJECTED") {
    void publishMatchRejected(actorId, targetId, intentType);
    return { action, isMutual: false, matchId: null };
  }

  if (incomingAction?.action === "ACCEPTED") {
    return createMutualMatch(actorId, targetId, intentType, completingAction);
  }
  return { action, isMutual: false, matchId: null };
}

async function createMutualMatch(
  actorId: string,
  targetId: string,
  intentType: IntentType,
  completingAction: MatchAction,
): Promise<MatchActionResult> {
  const [userAId, userBId] = actorId < targetId
    ? [actorId, targetId]
    : [targetId, actorId];
  try {
    const match = await prismaClient.match.create({
      data: {
        userAId,
        userBId,
        intentType,
        status: "MATCHED",
        matchedAt: new Date(),
        initiatedBy: actorId,
        similarityScore: completingAction.similarityScore,
        compatibility: completingAction.compatibility,
        levelSource: completingAction.levelSource,
        matchTier: completingAction.matchTier,
        matchedSkills: completingAction.matchedSkills,
        matchedLanguages: completingAction.matchedLanguages,
        matchedDomains: completingAction.matchedDomains,
        explanation: completingAction.explanation ?? undefined,
      },
    });
    void publishMatchAccepted(
      match.id,
      match.userAId,
      match.userBId,
      match.intentType,
      match.similarityScore ?? 0,
    );
    return { action: "ACCEPTED", isMutual: true, matchId: match.id };
  } catch (error: any) {
    if (error.code === "P2002") {
      const existingMatch = await prismaClient.match.findUnique({
        where: { userAId_userBId_intentType: { userAId, userBId, intentType } },
      });
      return {
        action: "ACCEPTED",
        isMutual: true,
        matchId: existingMatch?.id ?? null,
      };
    }
    throw error;
  }
}

export async function getMutualMatches(userId: string) {
  const matches = await prismaClient.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: "MATCHED",
    },
    include: {
      userA: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
      userB: { select: { id: true, displayName: true, avatarUrl: true, username: true } },
    },
    orderBy: { matchedAt: "desc" },
  });
  return matches.map((match) => ({
    matchId: match.id,
    similarityScore: match.similarityScore,
    compatibility: match.compatibility,
    levelSource: match.levelSource,
    matchedSkills: match.matchedSkills,
    matchedLanguages: match.matchedLanguages,
    matchedDomains: match.matchedDomains,
    matchTier: match.matchTier,
    intentType: match.intentType,
    matchedAt: match.matchedAt,
    matchedUser: match.userAId === userId ? match.userB : match.userA,
  }));
}

export async function getPendingRequests(userId: string) {
  const incomingAccepts = await prismaClient.matchAction.findMany({
    where: { targetId: userId, action: "ACCEPTED" },
    orderBy: { createdAt: "desc" },
  });
  if (incomingAccepts.length === 0) return [];

  const requesterIds = incomingAccepts.map((action) => action.actorId);
  const myResponses = await prismaClient.matchAction.findMany({
    where: { actorId: userId, targetId: { in: requesterIds } },
  });
  const respondedSet = new Set(
    myResponses.map((response) => `${response.targetId}_${response.intentType}`),
  );
  const pendingActions = incomingAccepts.filter(
    (action) => !respondedSet.has(`${action.actorId}_${action.intentType}`),
  );
  if (pendingActions.length === 0) return [];

  const users = await prismaClient.user.findMany({
    where: { id: { in: [...new Set(pendingActions.map((action) => action.actorId))] } },
    include: { profile: true },
  });
  return pendingActions.map((action) => {
    const user = users.find((candidate) => candidate.id === action.actorId)!;
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      college: user.college,
      profileScore: user.profile?.profileScore ?? 0,
      cfRating: user.profile?.cfRating ?? null,
      skillTags: user.profile?.skillTags ?? [],
      requestedIntent: action.intentType,
      requestedAt: action.createdAt,
      similarityScore: action.similarityScore,
      compatibility: action.compatibility,
      levelSource: action.levelSource,
      matchedSkills: action.matchedSkills,
      matchedLanguages: action.matchedLanguages,
      matchedDomains: action.matchedDomains,
      matchTier: action.matchTier,
    };
  });
}
