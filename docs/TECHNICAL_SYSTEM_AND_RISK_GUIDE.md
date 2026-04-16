# Technical System and Risk Guide

Purpose: explain everything in plain language so no hidden part of the system is missed.

## Big Picture (Toddler Version)

Imagine a city made of blocks:

- one block shows screens (what users see)
- one block answers requests (the API)
- one block stores memory (the database)
- one block checks identity (who you are)
- one block sends helper messages (notifications)

If these blocks are stable and connected well, the app works reliably.

## What We Use (Languages and Runtime)

- **TypeScript**: main language for app and server code.
  - Why: catches many mistakes before users see them.
- **JavaScript**: some scripts/tools still use JS.
  - Why: quick utility scripts and compatibility.
- **SQL (through Prisma migrations)**: database structure changes.
  - Why: explicit, trackable data evolution.
- **Node.js runtime**: executes server-side code.
  - Why: standard runtime for Next.js ecosystem.

## Frameworks and Core Libraries

- **Next.js (App Router)**:
  - where: `app/` and `app/api/`
  - why: one framework for frontend and API routes
- **React**:
  - where: UI components/pages
  - why: component model for maintainable UI
- **Prisma**:
  - where: `lib/prisma.ts`, `prisma/schema.prisma`, migrations
  - why: typed DB access + safer schema management
- **Clerk**:
  - where: authentication and user session checks
  - why: reduces custom auth complexity and risk

## Testing and Quality Tools

- **ESLint**:
  - where: `npm run lint`
  - why: code consistency and early mistake detection
- **TypeScript typecheck**:
  - where: `npm run typecheck`
  - why: compile-time safety on data/types
- **Vitest**:
  - where: `tests/api`, `tests/services`
  - why: fast unit/integration-style checks for business rules
- **Playwright**:
  - where: `tests/e2e`
  - why: browser-level smoke checks for key routes

## App Capabilities and Logic Patterns

### Scheduling and Conflict Prevention

- Logic checks time overlaps before booking/rescheduling.
- Both user calendar and owner calendar are checked.
- Transaction usage reduces race-condition windows.

Why it matters:

- avoids double-booking
- preserves trust in appointment flow

### Inquiry Lifecycle

- Inquiry states: pending -> approved/dismissed -> finalized.
- Owner/broker permission checks gate management actions.
- Notifications mirror state changes.

Why it matters:

- clear status progression
- less ambiguity for both sides

### Notification System

- Mutation paths (create/delete/mark viewed) are service-backed.
- Route handlers focus more on request/response than heavy logic.

Why it matters:

- easier to maintain
- easier to test

## Algorithms and Decision Rules (Simple Explanation)

- **Time overlap rule**:
  - "If one meeting starts before another ends, and ends after another starts, they overlap."
- **Authorization rule**:
  - "Only the owner (or allowed role) can do owner actions."
- **State transition rule**:
  - "Some actions only work when previous steps happened first."
- **Deduplication rule**:
  - "If same slot appears multiple times, keep the safest interpretation."

## Data and Storage

- Primary local/dev DB: **SQLite** (through `DATABASE_URL`).
- Entities include:
  - users
  - homes
  - inquiries
  - availabilities
  - bookings
  - notifications
  - ratings

Why this model:

- supports full lifecycle from discovery to finalization and feedback.

## Current Risks (Security + Resource + Operational)

## 1) Security Risks (Current/Typical)

- **Route-by-route authz drift risk**:
  - many endpoints; some may still have inconsistent checks over time.
- **Input contract drift risk**:
  - not every route has strict schema validation yet.
- **Sensitive error leakage risk**:
  - mostly improved, but needs continuous discipline.

Mitigation direction:

- centralized service guards
- route schema validation policy
- standard error envelope

## 2) Reliability Risks

- **Concurrency edge cases**:
  - booking logic improved but still needs broad integration test coverage.
- **Notification coupling risk**:
  - heavy route logic still exists in retrieval/formatting paths.
- **State inconsistency risk**:
  - multi-step workflows depend on clean transitions and proper retries.

Mitigation direction:

- more service extraction
- more transactional boundaries
- deeper automated tests

## 3) Tooling/Resource Risks

- **Dependency vulnerability backlog**:
  - package audit reports unresolved issues.
- **CI gate completeness risk**:
  - checks must be enforced centrally (not only local runs).
- **Environment drift risk**:
  - dev/staging/prod parity can drift without strict release process.

Mitigation direction:

- scheduled dependency review
- required checks on protected branches
- environment checklist and release gates

## 4) Business Continuity Risks

- **Single-point knowledge risk**:
  - if docs are incomplete, process becomes person-dependent.
- **Scope creep risk**:
  - feature work can reduce hardening pace.

Mitigation direction:

- keep docs current
- enforce phase execution checklist

## Current Strengths to Build On

- clearer API error handling patterns
- service extraction has started
- integration and service tests in place
- E2E smoke scaffolding ready
- branch strategy documented and applied

## What “Good” Looks Like Before Beta

- every critical flow covered by automated tests
- strict authz and validation on all high-risk routes
- reproducible deployment and rollback
- visible monitoring for errors and latency
- team can follow process without guessing
