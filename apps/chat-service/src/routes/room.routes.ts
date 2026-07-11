import { Router } from "express";
import { extractUser } from "../middleware/extractUser";
import { getMessages } from "../handlers/room.handler";
import { getRooms } from "../handlers/rooms.handler";

export const roomRoutes = Router();

roomRoutes.use(extractUser);
// List all rooms for the authenticated user (called by the sidebar badge system)
roomRoutes.get("/", getRooms);
// Fetch paginated message history for a specific room
roomRoutes.get("/:roomId/messages", getMessages);