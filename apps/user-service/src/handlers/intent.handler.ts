import type { Request, Response, NextFunction } from "express";
import { intentService } from "../services/intent.service";
import {
  openToIntentsSchema,
  searchIntentSchema,
} from "../validators/user.validators";

function unauthorized(res: Response) {
  return res.status(401).json({ message: "Unauthorized" });
}

export const intentHandler = {
  async getIntents(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      res.json(await intentService.getIntentState(req.user.id));
    } catch (error) {
      next(error);
    }
  },

  async setSearchIntent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      const parsed = searchIntentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.format() });
      }
      res.json(await intentService.setSearchIntent(req.user.id, parsed.data));
    } catch (error) {
      next(error);
    }
  },

  async deleteSearchIntent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      res.json(await intentService.deleteSearchIntent(req.user.id));
    } catch (error) {
      next(error);
    }
  },

  async replaceOpenTo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      const parsed = openToIntentsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.format() });
      }
      res.json(await intentService.replaceOpenToIntents(req.user.id, parsed.data.intentTypes));
    } catch (error) {
      next(error);
    }
  },
};
