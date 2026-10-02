-- Plan the Main broker assigned to a team invite; applied to the child on accept.
ALTER TABLE "team_invitations" ADD COLUMN "tier" TEXT NOT NULL DEFAULT 'pro';
