-- Preserve global eligibility exclusions for connections created before the
-- ConnectionPair table existed. Rejections deliberately are not backfilled:
-- their cooldown is a seven-day Redis-only state.
INSERT INTO "ConnectionPair" ("pairKey", "userAId", "userBId", "connectionContext", "status", "createdAt", "updatedAt")
SELECT
  CASE WHEN "userAId" < "userBId" THEN "userAId" || ':' || "userBId" ELSE "userBId" || ':' || "userAId" END,
  LEAST("userAId", "userBId"),
  GREATEST("userAId", "userBId"),
  "connectionContext",
  'MATCHED'::"ConnectionStatus",
  "createdAt",
  "updatedAt"
FROM "Match"
WHERE "status" = 'MATCHED'
ON CONFLICT ("pairKey") DO UPDATE
  SET "status" = 'MATCHED', "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO "ConnectionPair" ("pairKey", "userAId", "userBId", "connectionContext", "status", "createdAt", "updatedAt")
SELECT DISTINCT ON (CASE WHEN "actorId" < "targetId" THEN "actorId" || ':' || "targetId" ELSE "targetId" || ':' || "actorId" END)
  CASE WHEN "actorId" < "targetId" THEN "actorId" || ':' || "targetId" ELSE "targetId" || ':' || "actorId" END,
  LEAST("actorId", "targetId"),
  GREATEST("actorId", "targetId"),
  "connectionContext",
  'PENDING'::"ConnectionStatus",
  "createdAt",
  "createdAt"
FROM "MatchAction"
WHERE "action" = 'ACCEPTED'
ON CONFLICT ("pairKey") DO NOTHING;
