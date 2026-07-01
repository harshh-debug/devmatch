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

    // 2. Join Personal Room (Crucial for receiving targeted events across all active tabs)
    socket.join(userId);

    // 3. Mark Online in Redis
    await PresenceService.addSocket(userId, socket.id);

    // 4. Broadcast Online Status to Peers
    try {
      const peers = await PresenceService.getPeers(userId);
      peers.forEach(peerId => {
        // We emit to the peer's personal room
        io.to(peerId).emit("presence:status", { userId, online: true });
      });
    } catch (error) {
      console.error(`[Presence] Failed to broadcast online status for ${userId}`, error);
    }
    registerMessageEvents(io, socket);
    registerTypingEvents(io, socket);
    registerReadEvents(io, socket);
    // 5. Handle Disconnect
    socket.on("disconnect", async (reason) => {
      console.log(`💤 [Socket] User disconnected: ${userId} (Reason: ${reason})`);
      
      try {
        const remainingSockets = await PresenceService.removeSocket(userId, socket.id);

        // Only broadcast "offline" if this was their very last open tab/device
        if (remainingSockets === 0) {
          const peers = await PresenceService.getPeers(userId);
          peers.forEach(peerId => {
            io.to(peerId).emit("presence:status", { userId, online: false });
          });
        }
      } catch (error) {
        console.error(`[Presence] Failed to handle disconnect for ${userId}`, error);
      }
    });
    
  });
}