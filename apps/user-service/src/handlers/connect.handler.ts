import type { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profile.service";
import { connectPlatformSchema } from "../validators/user.validators";
import { profileSyncQueue, type SyncPlatform } from "@devmatch/bullmq";

export const connectHandler = {
  async connectGitHub(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.status(401).json("Unauthorized");
      }

      const userId = req.user.id;
      const user = await profileService.getProfileByUserId(userId);

      if (!user?.profile?.githubUsername) {
        return res.status(400).json({
          message:
            "No GitHub account linked. Please link your account via GitHub Security verification first.",
        });
      }

      const platform: SyncPlatform = "github";

      await profileSyncQueue.add(platform, {
        userId,
        handle: user.profile.githubUsername,
        platform,
      });

      res.json({
        success: true,
        message: "GitHub sync triggered in background",
      });
    } catch (error) {
      next(error);
    }
  },

  async connectLeetCode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.status(401).json("Unauthorized");
      }

      const userId = req.user.id;
      const parsed = connectPlatformSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          errors: parsed.error.format(),
        });
      }

      const { handle } = parsed.data;

      await profileService.upsertProfile(userId, {
        leetcodeHandle: handle,
      });

      const platform: SyncPlatform = "leetcode";

      await profileSyncQueue.add(platform, {
        userId,
        handle,
        platform,
      });

      res.json({
        success: true,
        message: "LeetCode handle saved; sync triggered in background",
      });
    } catch (error) {
      next(error);
    }
  },

  async connectCodeforces(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        return res.status(401).json("Unauthorized");
      }

      const userId = req.user.id;
      const parsed = connectPlatformSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          errors: parsed.error.format(),
        });
      }

      const { handle } = parsed.data;

      await profileService.upsertProfile(userId, {
        codeforcesHandle: handle,
      });

      const platform: SyncPlatform = "codeforces";

      await profileSyncQueue.add(platform, {
        userId,
        handle,
        platform,
      });

      res.json({
        success: true,
        message: "Codeforces handle saved; sync triggered in background",
      });
    } catch (error) {
      next(error);
    }
  },
};