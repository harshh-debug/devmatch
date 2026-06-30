import { subscribe, TOPICS } from "@devmatch/kafka";
import { RoomService } from "../services/room.service";

export async function startRoomConsumers() {
  console.log("[Kafka] Starting Chat Service consumers...");

  await subscribe<{ matchId: string }>(
    [TOPICS.MATCH_ACCEPTED],
    "chat-service-group",
    async (topic, payload) => {
      console.log(`[Kafka] Received ${topic} for match: ${payload.matchId}`);
      await RoomService.createRoomFromMatch(payload.matchId);
    }
  );
}