import type { Request, Response } from "express";
import { ActionType, ConnectionContext } from "db/client";
import {
  MatchActionError,
  processMatchAction,
} from "../services/match.service";

export const postMatchAction = async (req: Request, res: Response) => {
  try {
    const actorId = req.user!.id;
    const { targetId, action, connectionContext, intentType } = req.body as Record<string, unknown>;
    // intentType is accepted for older clients, but all new actions carry an
    // explicit connection context (including GENERAL for Explore).
    const context = connectionContext ?? intentType;
    if (
      typeof targetId !== "string" ||
      !Object.values(ActionType).includes(action as ActionType) ||
      !Object.values(ConnectionContext).includes(context as ConnectionContext)
    ) {
      return res.status(400).json({
        success: false,
        message: "targetId, action, and connectionContext are required and must be valid",
      });
    }
    if (actorId === targetId) {
      return res.status(400).json({ success: false, message: "You cannot swipe on yourself" });
    }
    const result = await processMatchAction(
      actorId,
      targetId,
      action as ActionType,
      context as ConnectionContext,
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof MatchActionError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    console.error("[postMatchAction Handler] Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
