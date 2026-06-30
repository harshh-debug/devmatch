import prismaClient, { ActionType, IntentType } from "db/client";
import { markAsSeen } from "./cache/vectorCache";
import { calculateCosineSimilarity } from "./engine/cosine";
import { publishMatchAccepted, publishMatchRejected } from "./kafka/producer";

export interface MatchActionResult {
	action: ActionType;
	isMutual: boolean;
	matchId: string | null;
}

/**
 * Handles a user accepting or rejecting a candidate.
 */
export async function processMatchAction(
	actorId: string,
	targetId: string,
	action: ActionType,
	intentType: IntentType,
): Promise<MatchActionResult> {
	// 1. Instantly update Redis so the UI feels snappy on the next refresh
	// We don't await this blockingly because Redis is fast and fire-and-forget here is fine.
	markAsSeen(actorId, targetId, intentType).catch((err) =>
		console.error(
			`[Redis] Failed to mark ${targetId} as seen by ${actorId}:`,
			err,
		),
	);

	// 2. Record the action in PostgreSQL idempotently
	try {
		await prismaClient.matchAction.create({
			data: { actorId, targetId, action, intentType },
		});
	} catch (error: any) {
		// P2002 means they already swiped on this person for this intent.
		// We just proceed as normal (Idempotent).
		if (error.code !== "P2002") throw error;
	}

	// 3. If REJECTED, we are done.
	if (action === "REJECTED") {
        publishMatchRejected(actorId, targetId, intentType);
		return { action, isMutual: false, matchId: null };
	}

	// 4. If ACCEPTED, check if the target has already ACCEPTED the actor for this intent
	const targetAction = await prismaClient.matchAction.findUnique({
		where: {
			actorId_targetId_intentType: {
				actorId: targetId,
				targetId: actorId,
				intentType,
			},
		},
	});

	if (targetAction?.action === "ACCEPTED") {
		return await createMutualMatch(actorId, targetId, intentType);
	}

	// Still waiting on the other person
	return { action, isMutual: false, matchId: null };
}

/**
 * Creates the mutual match record. Contains race-condition guards.
 */
async function createMutualMatch(
	actorId: string,
	targetId: string,
	intentType: IntentType,
): Promise<MatchActionResult> {
	// Lexicographical sorting guarantees UserA is always the "lesser" string.
	// This makes the @@unique([userAId, userBId]) constraint work perfectly.
	const [userAId, userBId] =
		actorId < targetId ? [actorId, targetId] : [targetId, actorId];

	try {
		// Fetch authoritative vectors to record the score
		const profiles = await prismaClient.profile.findMany({
			where: { userId: { in: [actorId, targetId] } },
			select: { userId: true, skillVector: true },
		});
		const actorProfile = profiles.find((p) => p.userId === actorId);
		const targetProfile = profiles.find((p) => p.userId === targetId);

		let similarityScore = 0;
		if (actorProfile && targetProfile) {
			similarityScore = calculateCosineSimilarity(
				actorProfile.skillVector,
				targetProfile.skillVector,
			);
		}
		// Create the official Match
		const match = await prismaClient.match.create({
			data: {
				userAId,
				userBId,
				similarityScore,
				intentType,
				status: "MATCHED",
				matchedAt: new Date(),
				initiatedBy: actorId, // Tracking who "completed" the handshake
			},
		});
        
        publishMatchAccepted(
            match.id, 
            match.userAId, 
            match.userBId, 
            match.intentType, 
            match.similarityScore
        );

		return { action: "ACCEPTED", isMutual: true, matchId: match.id };
	} catch (error: any) {
		// RACE CONDITION GUARD:
		// If two concurrent requests try to create the match, the second one will hit a P2002.
		// That is totally fine. It means the match was successfully created 1 millisecond ago.
		if (error.code === "P2002") {
			const existingMatch = await prismaClient.match.findUnique({
				where: { userAId_userBId_intentType: { userAId, userBId,intentType } },
			});
			return {
				action: "ACCEPTED",
				isMutual: true,
				matchId: existingMatch?.id || null,
			};
		}
		throw error;
	}
}

/**
 * Fetches all active mutual matches for a user (used for the frontend matches list)
 */
export async function getMutualMatches(userId: string) {
	const matches = await prismaClient.match.findMany({
		where: {
			OR: [{ userAId: userId }, { userBId: userId }],
			status: "MATCHED",
		},
		include: {
			// We need to fetch the OTHER user's profile details to show in the UI
			userA: {
				select: {
					id: true,
					displayName: true,
					avatarUrl: true,
					username: true,
				},
			},
			userB: {
				select: {
					id: true,
					displayName: true,
					avatarUrl: true,
					username: true,
				},
			},
		},
		orderBy: { matchedAt: "desc" },
	});

	// Format the response so the frontend doesn't have to figure out who is User A vs B
	return matches.map((m) => {
		const otherUser = m.userAId === userId ? m.userB : m.userA;
		return {
			matchId: m.id,
			similarityScore: m.similarityScore,
			intentType: m.intentType,
			matchedAt: m.matchedAt,
			matchedUser: otherUser,
		};
	});
}



export async function getPendingRequests(userId: string) {
    const incomingAccepts = await prismaClient.matchAction.findMany({
        where: {
            targetId: userId,
            action: "ACCEPTED",
        },
        orderBy: { createdAt: 'desc' } 
    });

    if (incomingAccepts.length === 0) return [];

    const requesterIds = incomingAccepts.map(a => a.actorId);
    const myResponses = await prismaClient.matchAction.findMany({
        where: {
            actorId: userId,
            targetId: { in: requesterIds },
        },
    });

    // Example: "user456_HACKATHON"
    const respondedSet = new Set(
        myResponses.map(r => `${r.targetId}_${r.intentType}`)
    );

    const pendingActions = incomingAccepts.filter(
        a => !respondedSet.has(`${a.actorId}_${a.intentType}`)
    );

    if (pendingActions.length === 0) return [];

    const uniquePendingIds = [...new Set(pendingActions.map(a => a.actorId))];
    const profiles = await prismaClient.user.findMany({
        where: { id: { in: uniquePendingIds } },
        include: { profile: true },
    });

    return pendingActions.map(action => {
        const user = profiles.find(p => p.id === action.actorId)!;
        return {
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            college: user.college,
            profileScore: user.profile?.profileScore || 0,
            cfRating: user.profile?.cfRating || null,
            skillTags: user.profile?.skillTags || [],
            requestedIntent: action.intentType, 
            requestedAt: action.createdAt,
        };
    });
}