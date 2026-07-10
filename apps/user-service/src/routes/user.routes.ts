import { Router } from 'express';
import { profileHandler } from '../handlers/profile.handler';
import { intentHandler } from '../handlers/intent.handler';
import { extractUser } from '../middleware/extractUser';
import { connectHandler } from '../handlers/connect.handler';

export const userRouter = Router();

// ==========================================
// PROTECTED ROUTES 
// ==========================================

// Profile Management
userRouter.get('/users/me', extractUser, profileHandler.getMe);
userRouter.patch('/users/me', extractUser, profileHandler.updateMe);
userRouter.patch('/users/me/skills', extractUser, profileHandler.updateSkills);

// Intent Management
userRouter.get('/users/me/intent', extractUser, intentHandler.getIntent);
userRouter.post('/users/me/intent', extractUser, intentHandler.setIntent);
userRouter.delete('/users/me/intent', extractUser, intentHandler.deleteIntent);

// Third-Party Platform Connection & Sync Triggers
userRouter.post('/users/me/connect/github', extractUser, connectHandler.connectGitHub);
userRouter.post('/users/me/connect/leetcode', extractUser, connectHandler.connectLeetCode);
userRouter.post('/users/me/connect/codeforces', extractUser, connectHandler.connectCodeforces);

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Fetch public profile (MUST be defined after /users/me so Express doesn't treat "me" as an ID)
userRouter.get('/users/public/:id', profileHandler.getUser);