-- Broker hierarchy: Main (parent) / Default (standalone|child) brokers, team invitations, and boost approval requests.

-- AlterTable: broker hierarchy fields on users
ALTER TABLE "users" ADD COLUMN "brokerCategory" TEXT NOT NULL DEFAULT 'standalone';
ALTER TABLE "users" ADD COLUMN "parentBrokerId" INTEGER;

-- CreateIndex
CREATE INDEX "users_parentBrokerId_idx" ON "users"("parentBrokerId");
CREATE INDEX "users_brokerCategory_idx" ON "users"("brokerCategory");

-- AddForeignKey: self-relation for broker hierarchy
ALTER TABLE "users" ADD CONSTRAINT "users_parentBrokerId_fkey"
    FOREIGN KEY ("parentBrokerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: team_invitations
CREATE TABLE "team_invitations" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "inviterUserId" INTEGER NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeUserId" INTEGER,
    "token" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_key_key" ON "team_invitations"("key");
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");
CREATE INDEX "team_invitations_inviterUserId_status_idx" ON "team_invitations"("inviterUserId", "status");
CREATE INDEX "team_invitations_inviteeEmail_idx" ON "team_invitations"("inviteeEmail");

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviterUserId_fkey"
    FOREIGN KEY ("inviterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_inviteeUserId_fkey"
    FOREIGN KEY ("inviteeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: boost_requests
CREATE TABLE "boost_requests" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "homeId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decisionNote" TEXT,
    "proactive" BOOLEAN NOT NULL DEFAULT false,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "boost_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boost_requests_key_key" ON "boost_requests"("key");
CREATE INDEX "boost_requests_approverId_status_idx" ON "boost_requests"("approverId", "status");
CREATE INDEX "boost_requests_requesterId_status_idx" ON "boost_requests"("requesterId", "status");
CREATE INDEX "boost_requests_homeId_idx" ON "boost_requests"("homeId");

-- AddForeignKey
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_homeId_fkey"
    FOREIGN KEY ("homeId") REFERENCES "homes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boost_requests" ADD CONSTRAINT "boost_requests_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
