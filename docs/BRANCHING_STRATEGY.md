# Branching Strategy Playbook

This is the operational guide for humans working on this repository.

If you follow this file exactly, you can:

- make changes safely
- avoid breaking production
- recover quickly if something goes wrong

## Core Idea in Simple Words

Think of branches like roads:

- `main` is the public highway (stable, production-ready)
- `dev` is the testing road (where finished work comes together)
- `feature/*` and `hardening/*` are private side roads (where work is created)

Work is always born on a side road, tested on `dev`, and only then promoted to `main`.

## Branch Roles

- `main`: stable production line, always deployable
- `dev`: integration line for reviewed changes
- `feature/*`: normal product work (new user-facing behavior)
- `hardening/*`: reliability/security/testing/refactor work
- `hotfix/*`: urgent production bug fix from `main`
- `backup/*`: safety snapshot branches before big transitions

## One Rule You Must Never Break

Never work directly on `main`.

## Daily Workflow (Step-by-Step)

### Step 1: Update local `dev`

```bash
git checkout dev
git pull origin dev
```

### Step 2: Create your work branch

```bash
# product work
git checkout -b feature/<short-topic>

# production hardening work
git checkout -b hardening/<short-topic>
```

### Step 3: Make small commits

```bash
git add -A
git commit -m "type(scope): short message"
```

### Step 4: Push your branch

```bash
git push -u origin <branch-name>
```

### Step 5: Open PR to `dev`

Merge only when checks pass:

- lint
- typecheck
- tests (unit/integration/e2e where applicable)

## Promotion to Production (`dev` -> `main`)

Use this only when a release candidate is ready.

```bash
git checkout dev
git pull origin dev

git checkout main
git pull origin main
git merge --ff-only dev
git push origin main

git checkout dev
```

If `--ff-only` fails:

1. open PR from `dev` to `main`
2. resolve conflicts with review
3. merge with checks

## Hotfix Process (Production Incident)

### Step 1: branch from `main`

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<issue-name>
```

### Step 2: fix + test + PR to `main`

### Step 3: sync back to `dev`

```bash
git checkout dev
git pull origin dev
git merge main
git push origin dev
```

## Rollback Process

### Fast rollback to backup snapshot

```bash
git checkout backup/pre-production-20260415
```

### Restore `dev` to snapshot state

```bash
git checkout dev
git merge --ff-only backup/pre-production-20260415
```

### Restore from tag

```bash
git checkout -b restore/preprod pre-production-snapshot-20260415
```

## Practical Team Rules

- Keep PRs focused on one concern.
- Do not mix feature work and hardening work in one PR.
- Prefer small and reversible commits.
- Never bypass checks on `main`.
- If unsure, stop and ask before merging to `main`.

## Naming Examples

- `feature/owner-notes-card`
- `feature/inquiry-status-filter`
- `hardening/api-input-validation`
- `hardening/booking-overlap-invariants`
- `hotfix/booking-timezone-regression`

## Quick Start for New Team Members

If this is your first day:

1. checkout `dev`
2. pull latest
3. create your own `feature/*` branch
4. commit small
5. PR into `dev`
6. never touch `main` directly

