-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "clerkUserId" TEXT,
    "title" TEXT,
    "occupation" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "calComUsername" TEXT,
    "calComAccessToken" TEXT,
    "calComRefreshToken" TEXT,
    "calComTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homes" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "descriptionGreek" TEXT,
    "street" TEXT,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "area" TEXT,
    "listingType" TEXT NOT NULL DEFAULT 'rent',
    "pricePerMonth" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "floor" INTEGER,
    "heatingCategory" TEXT,
    "heatingAgent" TEXT,
    "sizeSqMeters" INTEGER,
    "yearBuilt" INTEGER,
    "yearRenovated" INTEGER,
    "availableFrom" TIMESTAMP(3) NOT NULL,
    "photos" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "promotedUntil" TIMESTAMP(3),
    "premiumPromotedUntil" TIMESTAMP(3),
    "closestMetro" DOUBLE PRECISION,
    "closestBus" DOUBLE PRECISION,
    "closestSchool" DOUBLE PRECISION,
    "closestHospital" DOUBLE PRECISION,
    "closestPark" DOUBLE PRECISION,
    "closestUniversity" DOUBLE PRECISION,
    "parking" BOOLEAN,
    "energyClass" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "raterId" INTEGER NOT NULL,
    "ratedUserId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "homeId" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedBy" INTEGER,
    "contactInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "homeKey" TEXT,
    "userId" INTEGER,
    "ownerKey" TEXT,
    "inquiryId" INTEGER,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameGreek" TEXT,
    "city" TEXT,
    "cityGreek" TEXT,
    "country" TEXT,
    "countryGreek" TEXT,
    "district" TEXT,
    "safety" DOUBLE PRECISION,
    "vibe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_search_logs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER,
    "userQuery" TEXT NOT NULL,
    "filterExtractionPrompt" TEXT,
    "filterExtractionResponse" TEXT,
    "hardFilters" TEXT,
    "softFilters" TEXT,
    "metro" TEXT,
    "bus" TEXT,
    "school" TEXT,
    "hospital" TEXT,
    "park" TEXT,
    "university" TEXT,
    "homesCountBeforeFilter" INTEGER NOT NULL,
    "homesCountAfterFilter" INTEGER NOT NULL,
    "finalHomesCount" INTEGER NOT NULL,
    "descriptionPhotoScore" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "homeId" INTEGER NOT NULL,
    "inquiryId" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "inquiryId" INTEGER,
    "availabilityId" INTEGER,
    "calComBookingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_key_key" ON "users"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkUserId_key" ON "users"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "homes_key_key" ON "homes"("key");

-- CreateIndex
CREATE INDEX "homes_finalized_idx" ON "homes"("finalized");

-- CreateIndex
CREATE INDEX "homes_city_idx" ON "homes"("city");

-- CreateIndex
CREATE INDEX "homes_ownerId_idx" ON "homes"("ownerId");

-- CreateIndex
CREATE INDEX "homes_listingType_idx" ON "homes"("listingType");

-- CreateIndex
CREATE INDEX "homes_area_idx" ON "homes"("area");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_key_key" ON "ratings"("key");

-- CreateIndex
CREATE INDEX "ratings_ratedUserId_idx" ON "ratings"("ratedUserId");

-- CreateIndex
CREATE INDEX "ratings_type_idx" ON "ratings"("type");

-- CreateIndex
CREATE INDEX "ratings_raterId_ratedUserId_type_idx" ON "ratings"("raterId", "ratedUserId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_key_key" ON "inquiries"("key");

-- CreateIndex
CREATE INDEX "inquiries_userId_idx" ON "inquiries"("userId");

-- CreateIndex
CREATE INDEX "inquiries_homeId_idx" ON "inquiries"("homeId");

-- CreateIndex
CREATE INDEX "inquiries_approved_idx" ON "inquiries"("approved");

-- CreateIndex
CREATE INDEX "inquiries_dismissed_idx" ON "inquiries"("dismissed");

-- CreateIndex
CREATE INDEX "inquiries_finalized_idx" ON "inquiries"("finalized");

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_userId_homeId_key" ON "inquiries"("userId", "homeId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_key_key" ON "notifications"("key");

-- CreateIndex
CREATE INDEX "notifications_recipientId_idx" ON "notifications"("recipientId");

-- CreateIndex
CREATE INDEX "notifications_deleted_idx" ON "notifications"("deleted");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_viewed_idx" ON "notifications"("viewed");

-- CreateIndex
CREATE UNIQUE INDEX "areas_key_key" ON "areas"("key");

-- CreateIndex
CREATE INDEX "areas_name_idx" ON "areas"("name");

-- CreateIndex
CREATE INDEX "areas_city_idx" ON "areas"("city");

-- CreateIndex
CREATE INDEX "areas_country_idx" ON "areas"("country");

-- CreateIndex
CREATE INDEX "areas_district_idx" ON "areas"("district");

-- CreateIndex
CREATE UNIQUE INDEX "ai_search_logs_key_key" ON "ai_search_logs"("key");

-- CreateIndex
CREATE INDEX "ai_search_logs_userId_idx" ON "ai_search_logs"("userId");

-- CreateIndex
CREATE INDEX "ai_search_logs_createdAt_idx" ON "ai_search_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "universities_key_key" ON "universities"("key");

-- CreateIndex
CREATE INDEX "universities_city_idx" ON "universities"("city");

-- CreateIndex
CREATE UNIQUE INDEX "availabilities_key_key" ON "availabilities"("key");

-- CreateIndex
CREATE INDEX "availabilities_homeId_idx" ON "availabilities"("homeId");

-- CreateIndex
CREATE INDEX "availabilities_inquiryId_idx" ON "availabilities"("inquiryId");

-- CreateIndex
CREATE INDEX "availabilities_date_idx" ON "availabilities"("date");

-- CreateIndex
CREATE INDEX "availabilities_isAvailable_idx" ON "availabilities"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_key_key" ON "bookings"("key");

-- CreateIndex
CREATE INDEX "bookings_userId_idx" ON "bookings"("userId");

-- CreateIndex
CREATE INDEX "bookings_ownerId_idx" ON "bookings"("ownerId");

-- CreateIndex
CREATE INDEX "bookings_startTime_idx" ON "bookings"("startTime");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_availabilityId_idx" ON "bookings"("availabilityId");

-- AddForeignKey
ALTER TABLE "homes" ADD CONSTRAINT "homes_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "availabilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
