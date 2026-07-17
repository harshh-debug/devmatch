import type { Request, Response } from "express";
import {
  getRankedCandidates,
  getSimilarCandidates,
  getExploreCandidates,
  MatchEngineError,
} from "../services/engine/ranker";

function parsePositiveInteger(value: unknown, fallback: number) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseRevision(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function handleCandidates(req: Request, res: Response, explore: boolean) {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const requestedLimit = parsePositiveInteger(req.query.limit, 20);
    const intentRevision = parseRevision(req.query.intentRevision);
    if (page === null || requestedLimit === null || intentRevision === null) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PAGINATION",
        message: "page and limit must be positive integers; intentRevision must be a non-negative integer",
      });
    }
    const limit = Math.min(requestedLimit, 50);
    const result = explore
      ? await getSimilarCandidates(req.user!.id, page, limit, intentRevision)
      : await getRankedCandidates(req.user!.id, page, limit, intentRevision);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof MatchEngineError) {
      return res.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    console.error("[Candidates] Error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export const getCandidates = (req: Request, res: Response) =>
  handleCandidates(req, res, false);

export const getSimilar = (req: Request, res: Response) =>
  handleCandidates(req, res, true);

export const getExplore = async (req: Request, res: Response) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const requestedLimit = parsePositiveInteger(req.query.limit, 20);
    if (page === null || requestedLimit === null) {
      return res.status(400).json({ success: false, code: "INVALID_PAGINATION", message: "page and limit must be positive integers" });
    }
    const result = await getExploreCandidates(req.user!.id, page, Math.min(requestedLimit, 50));
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof MatchEngineError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error("[Explore] Error", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
