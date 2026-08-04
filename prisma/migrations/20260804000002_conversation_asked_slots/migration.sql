-- AlterTable
-- Dialogue-policy slot ids the assistant has already asked about. A slot the user declined
-- to answer stays unknown, so without this the policy would select it again every turn.
ALTER TABLE "search_conversations" ADD COLUMN "askedSlots" JSONB;
