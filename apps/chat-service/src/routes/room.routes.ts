import { Router } from "express";
import { extractUser } from "../middleware/extractUser";
import { getMessages } from "../handlers/room.handler";

export const roomRoutes = Router();

roomRoutes.use(extractUser);
roomRoutes.get("/:roomId/messages", getMessages);