import type { Request, Response } from "express";
import { getRankedCandidates } from "../services/engine/ranker";
import type { IntentType } from "db/client";

export const getCandidates = async (req: Request, res: Response) => {
    try {
        const requesterId = req.user!.id;
        
        // Extract query parameters with defaults
        const intentType = req.query.intentType as IntentType;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const ratingMin = req.query.ratingMin ? parseInt(req.query.ratingMin as string) : undefined;
        const ratingMax = req.query.ratingMax ? parseInt(req.query.ratingMax as string) : undefined;

        if (!intentType) {
            return res.status(400).json({ success: false, message: "intentType query parameter is required" });
        }

        const result = await getRankedCandidates(
            requesterId,
            intentType,
            page,
            limit,
            ratingMin,
            ratingMax
        );

        // If totalAvailable is 0 and they requested page 1, they either have an incomplete profile 
        // or the pool is genuinely empty even after relaxation.
        if (result.totalAvailable === 0 && page === 1) {
            return res.status(200).json({
                success: true,
                message: "No candidates available or profile incomplete.",
                data: result
            });
        }

        return res.status(200).json({ success: true, data: result });

    } catch (error) {
        console.error("[getCandidates Handler] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};