-- SavedHome table (user favourites / heart button)
CREATE TABLE IF NOT EXISTS "saved_homes" (
    "id"        SERIAL PRIMARY KEY,
    "userId"    INTEGER NOT NULL,
    "homeId"    INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_homes_userId_homeId_key" UNIQUE ("userId", "homeId"),
    CONSTRAINT "saved_homes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "saved_homes_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "saved_homes_userId_idx"  ON "saved_homes"("userId");
CREATE INDEX IF NOT EXISTS "saved_homes_homeId_idx"  ON "saved_homes"("homeId");

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS "homes_finalized_city_listingType_idx"  ON "homes"("finalized", "city", "listingType");
CREATE INDEX IF NOT EXISTS "inquiries_userId_approved_finalized_idx" ON "inquiries"("userId", "approved", "finalized");
