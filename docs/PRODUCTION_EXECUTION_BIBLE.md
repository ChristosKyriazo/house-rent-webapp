# Production Execution Bible

Purpose: this is the strict trail to follow so the team reaches beta with minimum extra effort.

This document is action-first. Treat each checkbox as mandatory.

## North Star

Reach a near-production system before beta so post-beta effort is minimal.

Success means:

- critical flows are stable
- security and permissions are predictable
- deployments are safe
- incidents are observable and recoverable

## Non-Negotiable Rules

- No direct commits to `main`.
- No phase skipping.
- No large unreviewed PRs.
- No release without passing required checks.
- No "we will fix it later" for critical auth/scheduling issues.

## Phased Path

## Phase 1 - Safety and Correctness (Done)

Goal:

- eliminate high-risk correctness and permission issues

Required outputs:

- standardized API error patterns
- overlap-safe booking logic
- core authz guardrails
- foundational docs and branch strategy

Exit criteria:

- typecheck/lint pass for active hardening branch
- no known critical scheduling/auth bugs in core workflows

## Phase 2 - Maintainability and Test Coverage (Done in branch)

Goal:

- reduce route complexity
- increase automated confidence

Required outputs:

- service extraction started and applied to critical flows
- integration/service tests for high-risk APIs
- E2E smoke scaffolding

Exit criteria:

- service-layer pattern established
- test commands available and green on branch

## Phase 3 - Operability and Launch Readiness (Next)

Goal:

- make production observable, supportable, and release-safe

Required outputs:

1. Structured logging standard
2. Error tracking and alert policy
3. Metrics dashboard for critical business flows
4. Staging release checklist
5. Incident and rollback runbook

Exit criteria:

- team can detect and triage incidents quickly
- release process is repeatable and documented

## Phase 4 - Beta Gate

Goal:

- convert engineering readiness into controlled user rollout

Required outputs:

1. Beta feature flags and rollout rules
2. Support escalation workflow
3. Data/feedback capture plan
4. Weekly risk review rhythm

Exit criteria:

- controlled beta can run without emergency engineering mode

## Weekly Operating Rhythm (How to Stay on Trail)

Every week:

1. Plan weekly scope from this bible
2. Pick 1-2 high-priority objectives only
3. Track blockers explicitly
4. End week with release-readiness check

Never start next week without closing previous week status.

## Release-Readiness Checklist (Must Pass Before Beta)

- [ ] Branch protections active on `main`
- [ ] Required checks configured in CI
- [ ] `lint`, `typecheck`, test suites green in CI
- [ ] Critical user journeys tested end-to-end
- [ ] Logging and alerting live
- [ ] Rollback process tested
- [ ] On-call/owner responsibilities defined
- [ ] Security review pass on high-risk endpoints

## Decision Framework (When Team Disagrees)

Use this priority order:

1. User safety and data integrity
2. System reliability
3. Security posture
4. Delivery speed
5. Nice-to-have polish

If a choice improves speed but hurts reliability/security, do not choose it.

## Scope Control Guardrails

Allowed during readiness phases:

- fixes
- refactors that reduce risk
- tests
- observability work

Not allowed unless explicitly approved:

- large new product surfaces
- major redesigns
- architecture rewrites not tied to immediate risk

## Ownership Model

Each phase item must have:

- one owner
- one due date
- one measurable completion signal

No owner means not started.

## How to Use This Document Daily

Before work:

- pick one unchecked item
- define completion evidence

After work:

- update status
- link relevant PR/commit
- note open risks

## Final Beta Readiness Statement Template

Use this when phase trail is complete:

"Core workflows are stable, monitored, and recoverable. Security and scheduling safeguards are active, release controls are enforced, and the team can support controlled real-user traffic."
