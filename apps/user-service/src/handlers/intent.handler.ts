import type { Request, Response, NextFunction } from "express";
import {
  IntentConfigurationError,
  intentService,
} from "../services/intent.service";
import {
  intentConfigurationSchema,
  intentTypeSchema,
  openToIntentsSchema,
  putSearchIntentSchema,
} from "../validators/user.validators";

function unauthorized(res: Response) {
  return res.status(401).json({ message: "Unauthorized" });
}

function handleIntentError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof IntentConfigurationError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    });
  }
  next(error);
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

  async putIntentConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      const intentType = intentTypeSchema.safeParse(req.params.intentType);
      if (!intentType.success) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INTENT_TYPE",
          message: "Unknown intent type.",
        });
      }
      const parsed = intentConfigurationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INTENT_CONFIGURATION",
          message: "Invalid intent configuration.",
          details: parsed.error.format(),
        });
      }
      if (parsed.data.intentType !== intentType.data) {
        return res.status(400).json({
          success: false,
          code: "INTENT_TYPE_MISMATCH",
          message: "Body intent type must match the route.",
        });
      }
      res.json(await intentService.saveIntentConfiguration(req.user.id, parsed.data));
    } catch (error) {
      handleIntentError(error, res, next);
    }
  },

  async setSearchIntent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      const parsed = putSearchIntentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          code: "INVALID_INTENT_CONFIGURATION",
          message: "Invalid search intent.",
          details: parsed.error.format(),
        });
      }
      res.json(await intentService.activateSearchIntent(
        req.user.id,
        parsed.data.intentType,
        parsed.data.configuration,
      ));
    } catch (error) {
      handleIntentError(error, res, next);
    }
  },

  async deleteSearchIntent(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) return unauthorized(res);
      res.json(await intentService.deleteSearchIntent(req.user.id));
    } catch (error) {
      handleIntentError(error, res, next);
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
      handleIntentError(error, res, next);
    }
  },
};
