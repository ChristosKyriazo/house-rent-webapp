---
name: e2e-spec
description: Add or run a Playwright E2E spec in the right project. Use when writing browser-level tests, or when an existing spec is not running or is failing for environment reasons.
---

Playwright runs against a **real deployed environment**, never localhost. `E2E_BASE_URL` defaults to `https://dev.kaparro.com`, so **specs write real data into staging.** Keep that in mind when choosing fixtures.

## The six projects, and where a new spec goes

`playwright.config.ts` assigns specs to projects by explicit `testMatch` patterns:

| Project | Auth | Matches |
|---|---|---|
| `public` | none | `smoke`, `search`, `map`, `compare`, `saved`, `owner-dashboard` |
| `owner` | `.auth/owner.json` | `owner.spec.ts`, `role-checks/owner-*.spec.ts` |
| `renter` | `.auth/renter.json` | `renter.spec.ts` |
| `broker` | `.auth/broker.json` | `broker.spec.ts`, `role-checks/broker-*.spec.ts` |
| `both` | `.auth/both.json` | `both.spec.ts`, `role-checks/both-*.spec.ts` |
| `flows` | per-spec | `flows/*.spec.ts` |

**A new file that matches no pattern runs in no project — it will silently never execute.** Either name it to fit an existing pattern (`role-checks/owner-<thing>.spec.ts`, `flows/<thing>.spec.ts`) or add the pattern to the project's `testMatch`. After adding a spec, confirm it is actually collected:

```bash
npx playwright test --list | grep <your-spec>
```

`flows/` is a sequential story — `01-owner-creates-listing` through `07-renter-accepts-and-both-rate` — and each flow spec sets its own `storageState` via `test.use()` rather than inheriting one from the project. `fullyParallel` is off and `workers: 1`, so ordering within a project is stable; do not write a spec that depends on another project having run.

## Credentials

`tests/e2e/global-setup.ts` mints short-lived Clerk sign-in tokens via `@clerk/backend` and saves storage states into `tests/e2e/.auth/`. It needs, in `.env.test`:

```
CLERK_SECRET_KEY=sk_...
TEST_OWNER_EMAIL=      TEST_OWNER_PASSWORD=
TEST_RENTER_EMAIL=     TEST_RENTER_PASSWORD=
TEST_BROKER_EMAIL=     TEST_BROKER_PASSWORD=
TEST_BOTH_EMAIL=       TEST_BOTH_PASSWORD=
```

Global setup **throws** on a missing role email or `CLERK_SECRET_KEY`, so a local run fails loudly. CI does the opposite: `e2e.yml` falls back to `--project=public` with a `::warning::` and still reports green. If an authenticated regression reached staging unnoticed, check for that warning first.

`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` are passed as `CF-Access-*` headers when set, for Cloudflare Access–gated environments.

## Running

```bash
npm run test:e2e              # everything
npm run test:e2e:smoke        # public project only — no credentials needed
npm run test:e2e:auth         # owner + renter + broker + both
npm run test:e2e:flows        # the sequential story
npm run test:e2e:role-checks  # owner + broker + both
npm run test:e2e:report       # open the last HTML report
E2E_BASE_URL=http://localhost:3000 npm run test:e2e:smoke   # against a local dev server
```

Timeout is 60s per test; screenshots and video are always on, trace on first retry. Reports upload as a CI artifact (`playwright-report-<run_id>`, 14 days).

## Where these run in the pipeline

- Smoke, after every staging deploy — the `e2e` job at the end of `deploy.yml`, staging only.
- Full suite, on a `dev` → `main` PR — the release gate.
- Never against production: these specs write data.
