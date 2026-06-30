import type { Request, Response } from "express";
import { RoomService } from "../services/room.service";

export const getMessages = async (req: Request, res: Response) => {
	try {
		const { roomId } = req.params;

		if (!roomId) {
			return res
				.status(400)
				.json({ success: false, message: "Room ID is required" });
		}
		if (typeof roomId !== "string") {
			return res.status(400).json({
				success: false,
				message: "Invalid room ID",
			});
		}

		if (!req.user) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const userId = req.user.id;
		const cursor =
			typeof req.query.cursor === "string" ? req.query.cursor : undefined;
		const limit =
			typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 30;

		// Security check: Must be a participant
		const isParticipant = await RoomService.isUserInRoom(roomId, userId);

		if (!isParticipant) {
			console.warn(
				`[Security] User ${userId} attempted to read room ${roomId}`,
			);
			return res.status(403).json({ success: false, message: "Forbidden" });
		}

		const messages = await RoomService.getRoomMessages(roomId, cursor, limit);
		const lastMessage = messages.at(-1);

		return res.status(200).json({
			success: true,
			data: {
				messages,
				nextCursor:
					messages.length === limit ? (lastMessage?.id ?? null) : null,
			},
		});
	} catch (error) {
		console.error("[Room Handler] Error fetching messages:", error);
		return res
			.status(500)
			.json({ success: false, message: "Internal server error" });
	}
};
