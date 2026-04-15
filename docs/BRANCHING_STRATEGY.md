# Branching Strategy and Promotion Workflow

This project uses a staged promotion model so changes are reversible and production stays stable.

## Branch Purposes

- `main`: production-ready code only. Every commit should be deployable.
- `dev`: integration branch for approved feature work and hardening work.
- `hardening/*`: production-readiness workstreams (security, testing, refactors, reliability).
- `feature/*`: scoped product changes (new UI, small API additions, UX improvements).
- `hotfix/*`: urgent production fixes branched from `main` and merged back into both `main` and `dev`.
- `backup/*`: point-in-time safety branches before major transitions.

## Current Safety Snapshot

- Backup branch: `backup/pre-production-20260415`
- Snapshot tag: `pre-production-snapshot-20260415`
- Local source archive: `../webapp-source-backup-20260415.tar.gz`

Use this snapshot to recover quickly if hardening work causes regressions.

## Daily Development Flow

1. Start from latest `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   ```

2. Create a scoped working branch:

   ```bash
   # for product work
   git checkout -b feature/<short-name>

   # for production-readiness work
   git checkout -b hardening/<short-name>
   ```

3. Implement in small commits:

   ```bash
   git add -A
   git commit -m "type: short description"
   ```

4. Push and open PR into `dev`:

   ```bash
   git push -u origin <branch-name>
   ```

5. Merge to `dev` only after checks pass (`lint`, `typecheck`, tests when present).

## Promotion from `dev` to `main`

Promote only when a release candidate is stable.

```bash
git checkout dev
git pull origin dev

git checkout main
git pull origin main
git merge --ff-only dev
git push origin main

git checkout dev
```

If `--ff-only` fails, create a PR from `dev` to `main` and merge with review.

## Hotfix Workflow (Production Incident)

1. Branch from `main`:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/<issue-name>
   ```

2. Fix, test, push, PR to `main`.
3. After merge to `main`, sync fix back to `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   git merge main
   git push origin dev
   ```

## Rollback and Recovery

- Quick rollback to snapshot:

  ```bash
  git checkout backup/pre-production-20260415
  ```

- Restore `dev` to snapshot state (non-destructive if branch is behind):

  ```bash
  git checkout dev
  git merge --ff-only backup/pre-production-20260415
  ```

- Recover exact code from tag:

  ```bash
  git checkout -b restore/preprod pre-production-snapshot-20260415
  ```

## Guardrails for Production-Readiness Phase

- Keep `main` protected (no direct commits).
- Treat `dev` as integration, not a long-lived personal branch.
- Prefer branches that do one concern only (security, validation, booking logic, tests, observability).
- Keep PRs small and reversible.
- Do not mix unrelated refactors with feature additions.

## Suggested Naming Conventions

- `feature/owner-notes-card`
- `feature/inquiry-status-filter`
- `hardening/api-input-validation`
- `hardening/booking-overlap-invariants`
- `hotfix/booking-timezone-regression`

