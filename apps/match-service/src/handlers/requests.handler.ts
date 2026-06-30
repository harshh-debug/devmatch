import type { Request, Response } from "express";
import { getPendingRequests } from "../services/match.service";

export const getRequests = async (req: Request, res: Response) => {
    if(!req.user){
        return res.status(411).json({
            success:false,
            message:"Unauthorized user"
        })
    }
    try {
        const userId = req.user.id;
        
        const requests = await getPendingRequests(userId);

        return res.status(200).json({ 
            success: true, 
            data: { requests } 
        });

    } catch (error) {
        console.error("[getRequests Handler] Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};