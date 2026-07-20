import prismaClient, {
  ActionType,
  ConnectionContext,
  type MatchAction,
  type Prisma,
} from "db/client";
import { markRejectedGlobally, reconstructMatchProfile } from "./cache/vectorCache";
import { evaluateRecommendation } from "./engine/ranker";
import type { IntentType, RecommendationSnapshot } from "./engine/types";
import { publishMatchAccepted, publishMatchRejected } from "./kafka/producer";

export class MatchActionError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export interface MatchActionResult {
  action: ActionType;
  isMutual: boolean;
  matchId: string | null;
  connectionContext: ConnectionContext;
}

const pairKey = (left: string, right: string) => left < right ? `${left}:${right}` : `${right}:${left}`;
const contextIntent = (context: ConnectionContext): IntentType | null => context === "GENERAL" ? null : context;

function snapshotData(snapshot: RecommendationSnapshot | null) {
  return snapshot ? {
    similarityScore: snapshot.similarityScore,
    compatibility: snapshot.compatibility,
    levelSource: snapshot.levelSource,
    resolvedMatchMode: snapshot.resolvedMatchMode,
    matchedSkills: snapshot.matchedSkills,
    matchedLanguages: snapshot.matchedLanguages,
    matchedFrameworks: snapshot.matchedFrameworks,
    matchedDomains: snapshot.matchedDomains,
    matchedRoles: snapshot.matchedRoles,
    matchedDsaGoals: snapshot.matchedGoals,
    matchedContributionTypes: snapshot.matchedContributionTypes,
    matchedRepositoryTopics: snapshot.matchedRepositoryTopics,
    niceToHaveMatchedGroups: snapshot.niceToHave.matchedGroupCount,
    niceToHaveTotalGroups: snapshot.niceToHave.totalGroupCount,
    niceToHaveMatchedValues: snapshot.niceToHave.matchedValueCount,
    explanation: snapshot.explanation as unknown as Prisma.InputJsonValue,
  } : {
    similarityScore: null, compatibility: null, levelSource: null, resolvedMatchMode: null,
    matchedSkills: [], matchedLanguages: [], matchedFrameworks: [], matchedDomains: [],
    matchedRoles: [], matchedDsaGoals: [], matchedContributionTypes: [], matchedRepositoryTopics: [],
    niceToHaveMatchedGroups: null, niceToHaveTotalGroups: null, niceToHaveMatchedValues: null,
    explanation: undefined,
  };
}

function snapshotFromAction(action: MatchAction): RecommendationSnapshot | null {
  if (action.similarityScore === null || action.compatibility === null || action.levelSource === null || action.resolvedMatchMode === null) return null;
  const intentType = action.intentType ?? "DSA";
  return {
    similarityScore: action.similarityScore, technicalFitScore: action.similarityScore,
    compatibility: action.compatibility, levelSource: action.levelSource, resolvedMatchMode: action.resolvedMatchMode,
    matchedSkills: action.matchedSkills, matchedLanguages: action.matchedLanguages,
    matchedFrameworks: action.matchedFrameworks, matchedDomains: action.matchedDomains,
    matchedRoles: action.matchedRoles, matchedGoals: action.matchedDsaGoals,
    matchedContributionTypes: action.matchedContributionTypes, matchedRepositoryTopics: action.matchedRepositoryTopics,
    niceToHave: { matchedGroupCount: action.niceToHaveMatchedGroups ?? 0, totalGroupCount: action.niceToHaveTotalGroups ?? 0, matchedValueCount: action.niceToHaveMatchedValues ?? 0 },
    capabilityEvidence: [], reasonCodes: [],
    explanation: { intentType, compatibility: action.compatibility, levelSource: action.levelSource, resolvedMatchMode: action.resolvedMatchMode, reasonCodes: [], capabilityEvidence: [] },
  };
}

async function computeSnapshot(actorId: string, targetId: string, context: ConnectionContext, incoming: MatchAction | null) {
  if (incoming?.action === "ACCEPTED") return snapshotFromAction(incoming);
  if (context === "GENERAL") return null;
  const [actor, target] = await Promise.all([reconstructMatchProfile(actorId), reconstructMatchProfile(targetId)]);
  if (!actor?.searchIntent || actor.searchIntent.intentType !== context) {
    throw new MatchActionError(409, "SEARCH_INTENT_CHANGED", "Your current search intent no longer matches this candidate.");
  }
  if (!target || !evaluateRecommendation(actor, target, context)) {
    throw new MatchActionError(409, "CANDIDATE_NO_LONGER_ELIGIBLE", "This candidate is no longer eligible.");
  }
  return evaluateRecommendation(actor, target, context)!.snapshot;
}

async function upsertAction(actorId: string, targetId: string, action: ActionType, context: ConnectionContext, snapshot: RecommendationSnapshot | null) {
  return prismaClient.matchAction.upsert({
    where: { actorId_targetId_connectionContext: { actorId, targetId, connectionContext: context } },
    create: { actorId, targetId, action, connectionContext: context, intentType: contextIntent(context), ...snapshotData(snapshot) },
    update: { action, ...snapshotData(snapshot) },
  });
}

export async function processMatchAction(actorId: string, targetId: string, action: ActionType, context: ConnectionContext): Promise<MatchActionResult> {
  const key = pairKey(actorId, targetId);
  const existingPair = await prismaClient.connectionPair.findUnique({ where: { pairKey: key } });
  if (existingPair?.status === "MATCHED") throw new MatchActionError(409, "ALREADY_CONNECTED", "You are already connected with this developer.");

  if (action === "REJECTED") {
    await upsertAction(actorId, targetId, action, context, null);
    if (existingPair?.status === "PENDING") await prismaClient.connectionPair.delete({ where: { pairKey: key } });
    await markRejectedGlobally(actorId, targetId);
    void publishMatchRejected(actorId, targetId, context);
    return { action, isMutual: false, matchId: null, connectionContext: context };
  }

  if (existingPair && existingPair.connectionContext !== context) {
    throw new MatchActionError(409, "PENDING_CONNECTION_EXISTS", "A connection request already exists for this pair.");
  }
  const incoming = await prismaClient.matchAction.findUnique({
    where: { actorId_targetId_connectionContext: { actorId: targetId, targetId: actorId, connectionContext: context } },
  });
  if (existingPair?.status === "PENDING" && !incoming) {
    throw new MatchActionError(409, "PENDING_CONNECTION_EXISTS", "A connection request is already pending.");
  }

  const snapshot = await computeSnapshot(actorId, targetId, context, incoming);
  const actionRow = await upsertAction(actorId, targetId, action, context, snapshot);
  if (!existingPair) {
    const [userAId, userBId] = actorId < targetId ? [actorId, targetId] : [targetId, actorId];
    try {
      await prismaClient.connectionPair.create({ data: { pairKey: key, userAId, userBId, connectionContext: context, status: "PENDING" } });
    } catch (error: any) {
      if (error.code === "P2002") throw new MatchActionError(409, "PENDING_CONNECTION_EXISTS", "A connection request is already pending.");
      throw error;
    }
    return { action, isMutual: false, matchId: null, connectionContext: context };
  }

  const [userAId, userBId] = actorId < targetId ? [actorId, targetId] : [targetId, actorId];
  try {
    const match = await prismaClient.$transaction(async (tx) => {
      await tx.connectionPair.update({ where: { pairKey: key }, data: { status: "MATCHED" } });
      return tx.match.create({ data: {
        userAId, userBId, connectionContext: context, intentType: contextIntent(context), status: "MATCHED", matchedAt: new Date(), initiatedBy: actorId,
        similarityScore: actionRow.similarityScore, compatibility: actionRow.compatibility, levelSource: actionRow.levelSource, resolvedMatchMode: actionRow.resolvedMatchMode,
        matchedSkills: actionRow.matchedSkills, matchedLanguages: actionRow.matchedLanguages, matchedFrameworks: actionRow.matchedFrameworks, matchedDomains: actionRow.matchedDomains,
        matchedRoles: actionRow.matchedRoles, matchedDsaGoals: actionRow.matchedDsaGoals, matchedContributionTypes: actionRow.matchedContributionTypes, matchedRepositoryTopics: actionRow.matchedRepositoryTopics,
        niceToHaveMatchedGroups: actionRow.niceToHaveMatchedGroups, niceToHaveTotalGroups: actionRow.niceToHaveTotalGroups, niceToHaveMatchedValues: actionRow.niceToHaveMatchedValues,
        explanation: actionRow.explanation ?? undefined,
      }});
    });
    void publishMatchAccepted(match.id, match.userAId, match.userBId, context, match.similarityScore ?? 0);
    return { action, isMutual: true, matchId: match.id, connectionContext: context };
  } catch (error: any) {
    if (error.code === "P2002") {
      const match = await prismaClient.match.findUnique({ where: { userAId_userBId: { userAId, userBId } } });
      return { action, isMutual: true, matchId: match?.id ?? null, connectionContext: context };
    }
    throw error;
  }
}

export async function getMutualMatches(userId: string) {
  const matches = await prismaClient.match.findMany({ where: { OR: [{ userAId: userId }, { userBId: userId }], status: "MATCHED" }, include: { userA: { select: { id: true, displayName: true, avatarUrl: true, username: true } }, userB: { select: { id: true, displayName: true, avatarUrl: true, username: true } } }, orderBy: { matchedAt: "desc" } });
  return matches.map((match) => ({ matchId: match.id, similarityScore: match.similarityScore, compatibility: match.compatibility, levelSource: match.levelSource, connectionContext: match.connectionContext, intentType: match.intentType, matchedSkills: match.matchedSkills, matchedAt: match.matchedAt, matchedUser: match.userAId === userId ? match.userB : match.userA }));
}

export async function getPendingRequests(userId: string) {
  const pairs = await prismaClient.connectionPair.findMany({ where: { status: "PENDING", OR: [{ userAId: userId }, { userBId: userId }] }, orderBy: { createdAt: "desc" } });
  const requests = await Promise.all(pairs.map(async (pair) => {
    const requesterId = pair.userAId === userId ? pair.userBId : pair.userAId;
    const action = await prismaClient.matchAction.findFirst({ where: { actorId: requesterId, targetId: userId, connectionContext: pair.connectionContext, action: "ACCEPTED" } });
    if (!action) return null;
    const user = await prismaClient.user.findUnique({ where: { id: requesterId }, include: { profile: true } });
    if (!user) return null;
    return { userId: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, college: user.college, profileScore: user.profile?.profileScore ?? 0, cfRating: user.profile?.cfRating ?? null, lcRating: user.profile?.lcRating ?? null, skillTags: user.profile?.skillTags ?? [], requestedIntent: pair.connectionContext, requestedAt: pair.createdAt };
  }));
  return requests.filter((request): request is NonNullable<typeof request> => request !== null);
}
