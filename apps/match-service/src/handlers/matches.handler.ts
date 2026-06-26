import type { Request, Response } from "express";
import { getMutualMatches } from "../services/match.service";

export const getMatchesList = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const matches = await getMutualMatches(userId);
        
        return res.status(200).json({ success: true, data: { matches } });
    } catch (error) {
        console.error("[getMatchesList Handler] Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};