import { Router } from "express";
import { extractUser } from "../middleware/extractUser";
import { getCandidates } from "../handlers/candidates.handler";
import { postMatchAction } from "../handlers/action.handler";
import { getMatchesList } from "../handlers/matches.handler";

export const matchRoutes = Router();

// All match routes require a valid logged-in user
matchRoutes.use(extractUser);

matchRoutes.get("/candidates", getCandidates);
matchRoutes.post("/action", postMatchAction);
matchRoutes.get("/matches", getMatchesList);