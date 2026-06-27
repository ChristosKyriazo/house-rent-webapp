-- Add overlimitHiddenAt to homes: set when a listing is hidden due to a tier downgrade.
-- NULL = visible to renters. Non-null = hidden until the owner re-upgrades.
ALTER TABLE "homes" ADD COLUMN "overlimitHiddenAt" TIMESTAMP(3);
