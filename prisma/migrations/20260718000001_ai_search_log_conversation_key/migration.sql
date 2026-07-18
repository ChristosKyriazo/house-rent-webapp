-- Groups every turn of one conversational AI search under its SearchConversation.key.
-- Null for one-shot (non-conversational) searches and for rows logged before this column existed.
ALTER TABLE "ai_search_logs" ADD COLUMN "conversationKey" TEXT;

CREATE INDEX "ai_search_logs_conversationKey_idx" ON "ai_search_logs"("conversationKey");
