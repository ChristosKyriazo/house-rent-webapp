# Phase 1 Execution Log (Production Hardening)

Audience: engineering + business stakeholders.

This document explains what was changed, why it matters for production, and how to operate it.

## Goal

Reduce production risk in the booking and availability flow by tightening:

- input validation
- authorization checks
- double-booking protection
- consistency of API error behavior

## What Was Implemented

### 1) Shared API response and parsing helpers

Files:

- `lib/api-utils.ts`

What changed:

- Added shared helpers for common API responses (`400`, `401`, `403`, `404`, `500`).
- Added safe parsing helpers for integers and dates.

Why it matters:

- Fewer ad-hoc checks and fewer inconsistent API responses.
- Easier maintenance and faster onboarding for new developers.

Business impact:

- More predictable errors for frontend handling.
- Lower support/debug time when users report issues.

### 2) Shared conflict detection for bookings

Files:

- `lib/booking-conflicts.ts`

What changed:

- Added a single function to evaluate overlapping scheduled bookings for both user and owner.
- Supports optional exclusion of a booking (needed for rescheduling).

Why it matters:

- Centralized overlap logic prevents divergence between create and reschedule flows.
- One source of truth lowers regression risk.

Business impact:

- Stronger protection against double booking.
- Better trust in scheduling reliability.

### 3) Booking creation hardening (`POST /api/bookings`)

Files:

- `app/api/bookings/route.ts`

What changed:

- Added stricter validation for `availabilityId`, `ownerId`, `startTime`, and `endTime`.
- Enforced valid time range (`endTime > startTime`).
- Moved conflict check + booking insert into a database transaction.
- Standardized error responses using shared API helpers.

Why it matters:

- Validation catches invalid requests before they affect data.
- Transaction reduces race-condition windows in booking creation.

Business impact:

- Fewer broken bookings in production.
- Less manual correction effort.

### 4) Booking reschedule/cancel hardening (`PATCH/DELETE /api/bookings/[id]`)

Files:

- `app/api/bookings/[id]/route.ts`

What changed:

- Added strict parsing for booking IDs and payload fields.
- Reused shared booking conflict detection for reschedule.
- Wrapped availability updates + booking update in a transaction for rescheduling.
- Removed verbose debug logging of booking overlap payloads.
- Standardized unauthorized/forbidden/not-found/bad-request responses.

Why it matters:

- Reduces data inconsistencies when changing slots.
- Prevents accidental info leakage from debug logging.

Business impact:

- More reliable changes to existing appointments.
- Cleaner operational logs.

### 5) Availability update authorization hardening

Files:

- `app/api/homes/[id]/availability/route.ts`

What changed:

- `PATCH` now verifies:
  - home exists,
  - requester is owner (or broker),
  - target availability belongs to that home.
- Added safer validation for `availabilityId`.
- Standardized error responses with shared helpers.

Why it matters:

- Closes a permission gap where updates could rely on ID alone.

Business impact:

- Better tenant isolation and stronger data integrity.

### 6) Unused dependency cleanup

Files:

- `package.json`
- `package-lock.json`

What changed:

- Removed unused dependencies:
  - `bcryptjs`
  - `@types/bcryptjs`

Why it matters:

- Smaller dependency surface and lower supply-chain risk.

Business impact:

- Reduced attack surface and maintenance overhead.

## Operational Notes

- Backup references remain available:
  - branch: `backup/pre-production-20260415`
  - tag: `pre-production-snapshot-20260415`
  - archive: `webapp-source-backup-20260415.tar.gz`
- Active hardening branch:
  - `hardening/production-readiness`

## Known Constraints

- Full repository typecheck currently includes unrelated in-progress files under `app/api/homes/promote/route.ts` that are not part of this Phase 1 hardening change set.
- This should be resolved or isolated before turning on strict CI gates for the entire repository.

## Next Recommended Step (Phase 1 continuation)

1. Apply shared validation/auth helpers to `notifications`, `inquiries`, and `ratings` APIs.
2. Add request schema validation for route payloads (lightweight runtime checks or Zod).
3. Add automated integration tests for booking create and reschedule conflict scenarios.

## Phase 1 - Part 2 (Current Session)

### 7) Notifications API validation and safer ownership checks

Files:

- `app/api/notifications/route.ts`

What changed:

- Reused shared API utility helpers for unauthorized/bad-request/server-error responses.
- Added strict numeric parsing for `notificationId`, `recipientId`, and optional `userId`.
- Switched delete behavior to `updateMany` plus explicit not-found response to avoid exceptions leaking behavior details.

Why it matters:

- Reduces invalid input edge cases and inconsistent error handling.
- Improves authorization safety by ensuring IDs are validated before DB writes.

Business impact:

- Fewer support incidents caused by malformed requests.
- More predictable frontend behavior for notification actions.

### 8) Inquiries API validation and role guardrails

Files:

- `app/api/inquiries/route.ts`

What changed:

- Reused shared API utility helpers across GET/POST/DELETE.
- Added strict parsing for `homeId` in request body/query.
- Added explicit guardrail preventing owners from creating inquiries on their own listings.
- Removed internal DB error details from public API responses.

Why it matters:

- Tightens API contract and reduces accidental misuse.
- Prevents information disclosure through verbose error payloads.

Business impact:

- Cleaner behavior for users and owners.
- Lower risk profile for externally callable endpoints.

## Phase 1 - Part 3 (Current Session)

### 9) Inquiry subroute hardening sweep

Files:

- `app/api/inquiries/finalized/route.ts`
- `app/api/inquiries/owner/route.ts`
- `app/api/inquiries/me/route.ts`
- `app/api/inquiries/approved/route.ts`
- `app/api/inquiries/[homeKey]/route.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/route.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/reject/route.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/finalize/route.ts`

What changed:

- Standardized auth and server error handling through shared API helpers.
- Added strict numeric parsing for `inquiryId` route params in action routes.
- Replaced broad ad-hoc `403/404/400` blocks with shared helper paths for clearer consistency.
- Removed remaining internal-error detail leakage patterns from user-facing responses.

Why it matters:

- Inquiry lifecycle endpoints now behave consistently under invalid input and unauthorized access.
- Lower chance of subtle auth bypasses due to inconsistent guard code.

Business impact:

- Fewer production support issues around inquiry actions and finalization flows.
- More predictable API contracts for frontend and future partner integrations.

### 10) Ratings API hardening sweep

Files:

- `app/api/ratings/route.ts`
- `app/api/ratings/[userId]/route.ts`
- `app/api/ratings/update/[id]/route.ts`
- `app/api/ratings/home/[homeKey]/route.ts`

What changed:

- Added strict integer parsing for `userId`, `ratingId`, and `ratedUserId`.
- Standardized error handling via shared API helpers.
- Normalized auth failure responses and reduced inconsistent message patterns.

Why it matters:

- Prevents invalid ID payloads from reaching database operations.
- Keeps rating create/update/read behavior stable and easier to reason about.

Business impact:

- Better reliability for trust features (ratings and reputation signals).
- Reduced operational noise from malformed requests.

## Phase 1 Completion Status

Phase 1 is functionally complete for the targeted hardening scope:

- booking and availability safety
- notifications and inquiries validation/auth consistency
- ratings endpoint validation/auth consistency
- branching and delivery documentation for stakeholders
- dependency surface cleanup

Remaining blocker before a strict green CI gate:

- repository-wide typecheck currently fails due to unrelated in-progress schema mismatch in `app/api/homes/promote/route.ts` (new fields not present in Prisma model yet).

Recommendation:

- treat `homes/promote` as a separate feature track and either complete its schema migration or keep it out of the hardening PR gate until stabilized.

## Phase 2 Kickoff (Current Session)

### A) Removed typecheck blocker by aligning promotions schema

Files:

- `prisma/schema.prisma`
- `app/api/homes/promote/route.ts`

What changed:

- Added missing `Home` fields back to Prisma schema:
  - `promotedUntil`
  - `premiumPromotedUntil`
- Regenerated Prisma client.
- Hardened promotions route with shared API helpers and strict days parsing (`7` or `30` only).

Outcome:

- Repository typecheck is now green again.
- Promotions endpoint follows the same validation/error patterns as other hardened routes.

### B) Phase 2 test baseline introduced

Files:

- `vitest.config.ts`
- `tests/api/bookings.post.test.ts`
- `tests/api/availability.patch.test.ts`
- `package.json`

What changed:

- Added Vitest-based API test runner (`test`, `test:integration` scripts).
- Added two integration-style route tests for core risk paths:
  - booking creation rejects invalid time ranges pre-transaction
  - availability patch rejects cross-home updates

Outcome:

- `npm run test:integration` passes.
- Hardening work now has executable checks beyond lint/typecheck.

### C) Inquiry finalization service extraction (Phase 2 maintainability)

Files:

- `lib/services/inquiry-finalization-service.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/finalize/route.ts`
- `tests/services/inquiry-finalization-service.test.ts`

What changed:

- Extracted the finalization business workflow from route handlers into a dedicated service module.
- Introduced explicit domain error type (`InquiryFinalizationError`) with status-aware mapping in route handlers.
- Added service-level test coverage for a core rule (cannot finalize without a scheduled booking).

Outcome:

- Route file is slimmer and focused on HTTP concerns.
- Business logic is reusable and easier to test independently.
- `npm run test` and `npm run typecheck` both pass after extraction.

### D) Notification mutation service extraction (Phase 2 maintainability)

Files:

- `lib/services/notification-service.ts`
- `app/api/notifications/route.ts`
- `tests/services/notification-service.test.ts`

What changed:

- Moved notification mutation operations into a dedicated service:
  - delete notification (ownership-aware)
  - mark all viewed
  - create notification
- Added explicit domain error (`NotificationServiceError`) for status-aware route mapping.
- Added service-level test coverage for ownership/not-found deletion handling.

Outcome:

- Notification route now keeps business logic out of handler branches.
- Mutation paths are easier to reuse, test, and extend without route bloat.

### E) Inquiry action workflow service extraction (Phase 2 maintainability)

Files:

- `lib/services/inquiry-management-service.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/route.ts`
- `app/api/inquiries/[homeKey]/[inquiryId]/reject/route.ts`
- `tests/services/inquiry-management-service.test.ts`

What changed:

- Extracted approve/dismiss/reject business workflows into a reusable inquiry management service.
- Introduced status-aware domain error mapping (`InquiryManagementError`) in route handlers.
- Added service-level rule coverage for reject-after-meeting constraint.

Outcome:

- Inquiry action routes are slimmer and easier to maintain.
- Workflow rules are reusable and testable outside HTTP route glue code.

### F) E2E smoke scaffolding for Phase 2

Files:

- `playwright.config.ts`
- `tests/e2e/smoke.spec.ts`
- `package.json` (`test:e2e`)

What changed:

- Added Playwright test runner configuration and baseline smoke tests for core page availability.
- Added runnable script for E2E checks.

Outcome:

- Phase 2 now includes both API/service tests and initial browser smoke coverage.

