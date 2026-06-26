import type { Request, Response } from "express";
import { processMatchAction } from "../services/match.service";
import type { ActionType, IntentType } from "db/client";

export const postMatchAction = async (req: Request, res: Response) => {
    try {
        const actorId = req.user!.id;
        const { targetId, action, intentType } = req.body as { 
            targetId: string; 
            action: ActionType; 
            intentType: IntentType; 
        };

        if (!targetId || !action || !intentType) {
            return res.status(400).json({ 
                success: false, 
                message: "targetId, action, and intentType are required" 
            });
        }

        if (actorId === targetId) {
            return res.status(400).json({ success: false, message: "You cannot swipe on yourself" });
        }

        const result = await processMatchAction(actorId, targetId, action, intentType);

        return res.status(200).json({ success: true, data: result });

    } catch (error) {
        console.error("[postMatchAction Handler] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};