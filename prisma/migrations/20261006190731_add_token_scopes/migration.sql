-- AlterTable
ALTER TABLE "api_tokens" ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Data: tokens created before scopes existed keep working, so they get every scope.
UPDATE "api_tokens"
SET "scopes" = ARRAY['collections:read', 'items:write', 'ai']
WHERE COALESCE(cardinality("scopes"), 0) = 0;

-- Data: a token can no longer be created without an expiry, so one that has none gets a year from now.
UPDATE "api_tokens"
SET "expiresAt" = NOW() + INTERVAL '365 days'
WHERE "expiresAt" IS NULL;
