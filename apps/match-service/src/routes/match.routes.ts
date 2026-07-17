import { Router } from "express";
import { extractUser } from "../middleware/extractUser";
import { getCandidates, getExplore, getSimilar } from "../handlers/candidates.handler";
import { postMatchAction } from "../handlers/action.handler";
import { getMatchesList } from "../handlers/matches.handler";
import { getRequests } from "../handlers/requests.handler";

export const matchRoutes = Router();

// All match routes require a valid logged-in user
matchRoutes.use(extractUser);

matchRoutes.get("/candidates", getCandidates);
matchRoutes.get("/similar", getSimilar);
matchRoutes.get("/explore", getExplore);
matchRoutes.post("/action", postMatchAction);
matchRoutes.get("/matches", getMatchesList);
matchRoutes.get("/requests", getRequests);
