import { subscribe, TOPICS } from "@devmatch/kafka";
import { RoomService } from "../services/room.service";
import { PresenceService } from "../services/presence.service";

type MatchAcceptedPayload = {
  matchId: string;
  userAId: string;
  userBId: string;
};

export async function startRoomConsumers() {
  console.log("[Kafka] Starting Chat Service consumers...");

  await subscribe<MatchAcceptedPayload>(
    [TOPICS.MATCH_ACCEPTED],
    "chat-service-group",
    async (topic, payload) => {
      console.log(`[Kafka] Received ${topic} for match: ${payload.matchId}`);
      await RoomService.createRoomFromMatch(payload.matchId);
      // Invalidate peer caches for both users so a subsequent presence sync reflects
      // the new ChatRoom immediately, without waiting for the TTL.
      await Promise.all([
        PresenceService.invalidatePeerCache(payload.userAId),
        PresenceService.invalidatePeerCache(payload.userBId),
      ]);
    },
  );
}
