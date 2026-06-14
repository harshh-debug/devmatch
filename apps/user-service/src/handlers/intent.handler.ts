import type { Request, Response } from 'express';
import { intentService } from '../services/intent.service';
import { setIntentSchema } from '../validators/user.validators';

export const intentHandler = {
  async getIntent(req: Request, res: Response) {
    const userId = req.user!.id; 
    const intent = await intentService.getActiveIntent(userId);
    
    res.json({ intent: intent || null });
  },

  async setIntent(req: Request, res: Response) {
    const userId = req.user!.id;
    const parsed = setIntentSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.format() });
    }

    const newIntent = await intentService.setIntent(userId, parsed.data);
    res.json(newIntent);
  },

  async deleteIntent(req: Request, res: Response) {
    const userId = req.user!.id;
    await intentService.deleteIntent(userId);
    
    res.json({ success: true });
  }
};