-- AlterTable
-- Which numeric bound(s) the assistant's last question asked about, e.g. ["maxPrice"].
-- Lets a bare numeric reply ("600") bind to the bound the user was actually asked for,
-- instead of being re-derived from conversation history by the next completion.
ALTER TABLE "search_conversations" ADD COLUMN "pendingNumeric" JSONB;
