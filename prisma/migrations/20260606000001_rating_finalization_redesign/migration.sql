-- Drop the old ratings table (only test data exists)
DROP TABLE IF EXISTS "ratings";

-- CreateTable: finalizations
CREATE TABLE "finalizations" (
    "id"           SERIAL NOT NULL,
    "key"          TEXT NOT NULL,
    "inquiryId"    INTEGER NOT NULL,
    "homeId"       INTEGER NOT NULL,
    "landlordId"   INTEGER NOT NULL,
    "tenantId"     INTEGER NOT NULL,
    "moveInDate"   TIMESTAMP(3) NOT NULL,
    "moveOutDate"  TIMESTAMP(3),
    "status"       TEXT NOT NULL DEFAULT 'pending_tenant',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finalizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finalizations_key_key"        ON "finalizations"("key");
CREATE UNIQUE INDEX "finalizations_inquiryId_key"  ON "finalizations"("inquiryId");
CREATE INDEX "finalizations_homeId_idx"            ON "finalizations"("homeId");
CREATE INDEX "finalizations_landlordId_idx"        ON "finalizations"("landlordId");
CREATE INDEX "finalizations_tenantId_idx"          ON "finalizations"("tenantId");

ALTER TABLE "finalizations"
    ADD CONSTRAINT "finalizations_inquiryId_fkey"
        FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finalizations"
    ADD CONSTRAINT "finalizations_homeId_fkey"
        FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finalizations"
    ADD CONSTRAINT "finalizations_landlordId_fkey"
        FOREIGN KEY ("landlordId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "finalizations"
    ADD CONSTRAINT "finalizations_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ratings (new multi-dimensional schema)
-- type values: viewing_tenant | viewing_broker | movein_house | moveout_house | moveout_tenant
-- scores is a JSON object whose shape depends on type (see schema comments)
CREATE TABLE "ratings" (
    "id"              SERIAL NOT NULL,
    "key"             TEXT NOT NULL,
    "type"            TEXT NOT NULL,
    "raterId"         INTEGER NOT NULL,
    "ratedUserId"     INTEGER,
    "ratedHomeId"     INTEGER,
    "bookingId"       INTEGER,
    "finalizationId"  INTEGER,
    "scores"          JSONB NOT NULL,
    "comment"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_key_key"          ON "ratings"("key");
CREATE INDEX "ratings_ratedUserId_idx"         ON "ratings"("ratedUserId");
CREATE INDEX "ratings_ratedHomeId_idx"         ON "ratings"("ratedHomeId");
CREATE INDEX "ratings_raterId_idx"             ON "ratings"("raterId");
CREATE INDEX "ratings_type_idx"                ON "ratings"("type");
CREATE INDEX "ratings_bookingId_idx"           ON "ratings"("bookingId");
CREATE INDEX "ratings_finalizationId_idx"      ON "ratings"("finalizationId");

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_raterId_fkey"
        FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_ratedUserId_fkey"
        FOREIGN KEY ("ratedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_ratedHomeId_fkey"
        FOREIGN KEY ("ratedHomeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_bookingId_fkey"
        FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_finalizationId_fkey"
        FOREIGN KEY ("finalizationId") REFERENCES "finalizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
