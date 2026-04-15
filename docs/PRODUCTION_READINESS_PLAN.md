# Production Readiness Plan

This plan hardens the current codebase without a rewrite.

## Scope Rule

- 80% hardening work, 20% essential feature work.
- No large new features during Phase 1.
- Every change should reduce operational risk.

## Phase 1 (Weeks 1-2): Safety and Correctness

1. API authorization audit (owner/user/resource-level checks on all routes).
2. Add request validation for API boundaries (`params`, `query`, `body`).
3. Normalize booking overlap logic into a shared server utility.
4. Ensure booking creation uses transactional checks to prevent double booking.
5. Standardize error responses (consistent status codes and error shape).
6. Add CI checks (`lint`, `typecheck`, basic test command).

Deliverable: no known critical authz or double-booking issues in core flows.

## Phase 2 (Weeks 3-4): Maintainability and Test Coverage

1. Extract route logic into `service` modules for booking, inquiries, notifications.
2. Remove duplicate slot/overlap logic between client and server where possible.
3. Add integration tests for booking and availability APIs.
4. Add E2E smoke tests for:
   - user signs in
   - user books a slot
   - owner sees booking/notification
5. Add branch protection and required checks on `main`.

Deliverable: core flows covered by automated checks and clean service boundaries.

## Phase 3 (Weeks 5-6): Operability and Launch Readiness

1. Add structured logging (request IDs, route, user ID where available).
2. Add error monitoring and alerting (Sentry or equivalent).
3. Add basic metrics dashboard (error rate, booking success rate, latency).
4. Build a staging checklist and release checklist.
5. Add rollback/runbook documentation for incidents.

Deliverable: production can be monitored and incidents can be handled quickly.

## Definition of Done (Production Candidate)

- Critical flows pass manual + automated checks.
- No critical authz or booking consistency issues open.
- Release can be rolled forward/back safely.
- Logs/errors provide enough context to debug incidents quickly.
- Team follows documented branch workflow in `docs/BRANCHING_STRATEGY.md`.

