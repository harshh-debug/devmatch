import { Server, Socket } from "socket.io";
import { PresenceService } from "../services/presence.service";
import { socketAuthMiddleware } from "../middleware/auth.middleware";
import { registerMessageEvents } from "./events/message.events";
import { registerTypingEvents } from "./events/typing.events";
import { registerReadEvents } from "./events/read.events";

export function initializeSocketIO(io: Server) {
  // 1. Enforce JWT authentication on handshake
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 [Socket] User connected: ${userId} (Socket: ${socket.id})`);

    // 2. Join Personal Room (architecture §3: used for cross-tab sync and system alerts)
    socket.join(userId);

    // Register event listeners SYNCHRONOUSLY before any `await`.
    registerMessageEvents(io, socket);
    registerTypingEvents(io, socket);
    registerReadEvents(io, socket);

    // 3. Mark Online in Redis
    await PresenceService.addSocket(userId, socket.id);

    // 4. Bidirectional Presence Sync
    //    (a) Tell my peers that I am now online (architecture §6)
    //    (b) Tell *me* which of my peers are currently online (issue H5 — without
    //        this, a freshly-connected user sees stale "offline" indicators for
    //        peers who connected before them).
    try {
      const peers = await PresenceService.getPeers(userId);
      const presenceResults = await Promise.all(
        peers.map(async (peerId) => {
          const online = await PresenceService.isOnline(peerId);
          return { peerId, online };
        }),
      );

      // (a) Outbound: I am online to my peers.
      peers.forEach((peerId) => {
        io.to(peerId).emit("presence:status", { userId, online: true });
      });

      // (b) Inbound: each peer's current status to me, scoped to a per-peer event so
      //     the client can update one indicator at a time.
      presenceResults.forEach(({ peerId, online }) => {
        socket.emit("presence:status", { userId: peerId, online });
      });
    } catch (error) {
      console.error(
        `[Presence] Failed to sync presence for ${userId}`,
        error,
      );
    }

    // 5. Handle Disconnect
    socket.on("disconnect", async (reason) => {
      console.log(
        `💤 [Socket] User disconnected: ${userId} (Reason: ${reason})`,
      );

      try {
        const remainingSockets = await PresenceService.removeSocket(
          userId,
          socket.id,
        );

        // Only broadcast "offline" if this was their very last open tab/device
        if (remainingSockets === 0) {
          const peers = await PresenceService.getPeers(userId);
          peers.forEach((peerId) => {
            io.to(peerId).emit("presence:status", {
              userId,
              online: false,
            });
          });
        }
      } catch (error) {
        console.error(
          `[Presence] Failed to handle disconnect for ${userId}`,
          error,
        );
      }
    });
  });
}
