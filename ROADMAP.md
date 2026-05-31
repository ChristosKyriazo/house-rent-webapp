# Production Readiness Roadmap

## Phase 1 — Security & Correctness
**Goal:** Harden the API surface and automate quality gates before any traffic hits.

- [x] Security headers (CSP, X-Frame-Options, CORS, HSTS) in `next.config.ts`
- [x] Zod validation schemas for all API routes (`lib/schemas/`)
- [x] Rate limiting middleware for external API calls (OpenAI, Google Maps)
- [x] GitHub Actions CI workflow: lint → typecheck → test on every PR
- [x] Audit all authorization checks (owner/user/resource-level) across API routes
- [x] Encrypt Cal.com tokens at rest in the database
- [x] Document and pin Node.js version (`.nvmrc` + `engines` in package.json)
- [x] Fix Vitest config to exclude `node_modules` tests (all 5 tests now pass cleanly)

## Phase 2 — Observability & Operations
**Goal:** Make production failures visible and recoverable within minutes.

- [x] Structured logging (pino) with request IDs on every API route
- [x] Error monitoring (Sentry) wired up with environment config
- [x] Health check endpoints (`/api/healthz`, `/api/readyz`)
- [x] Dockerfile + docker-compose for local/staging parity
- [x] CI/CD pipeline: GitHub Actions → deploy on merge to `main`
- [x] Deployment runbook documenting rollback procedure
- [x] Migrate from SQLite to PostgreSQL for production
- [x] Multi-environment config (`.env.staging.example`, `.env.production.example`)
- [x] Add missing `.env.example` keys: `CALCOM_API_KEY`, `SENTRY_DSN`, `LOG_LEVEL`

## Phase 3 — Test Coverage & Performance
**Goal:** Catch regressions automatically and keep response times acceptable under load.

- [x] Increase Vitest coverage to ≥60% on critical paths (auth, bookings, inquiries) — reached 64.3%
- [ ] E2E Playwright tests for full user journeys (signup → list → inquire → book → rate)
- [x] Coverage threshold enforced in CI (fail build below threshold) — `vitest.config.ts` thresholds: 60/55/60/60
- [x] Cache Google Maps geocoding results (24h in-memory TTL cache in `lib/google-maps.ts`)
- [x] Cache OpenAI-generated descriptions (SHA-256 keyed in-memory cache in `lib/house-description-generator.ts`)
- [x] Add retry + timeout handling for all external API calls (8s timeout on all Google Maps fetch calls)
- [x] Image optimization config in `next.config.ts` (AVIF/WebP, 7-day TTL, device sizes)
- [x] Fix booking creation race condition (`isolationLevel: 'Serializable'` on booking transaction)
- [ ] Load test booking endpoint at 2–3× expected peak concurrent requests

## Phase 4 — Maintainability (Ongoing)
**Goal:** Keep the codebase clean and safe to change as it grows.

- [x] Magic-byte MIME validation on all file uploads (upload + bulk-upload routes)
- [x] Sentry security event capture on admin auth failures
- [x] Add Prettier + ESLint integration (`prettier`, `eslint-config-prettier`, `eslint-plugin-security`)
- [x] Feature flags (`FEATURE_AI_SEARCH`, `FEATURE_BOOKINGS`) — set to "false" to disable without redeploy
- [x] Split `lib/ai-search-helpers.ts` into `lib/search/{location,scoring,description-scoring,student-context}.ts`
- [x] Error boundary: `app/components/ErrorBoundary.tsx` (reusable); error pages now report to Sentry
- [x] Skeleton loading: `SkeletonCard`/`SkeletonList` in `my-listings` and `my-inquiries`
- [ ] Reduce `any` usage to zero (currently ~185 warnings in API routes)
- [ ] Migrate `lib/translations.ts` (1123 lines) to `next-intl` or `i18next`
- [ ] Add `jsx-a11y` ESLint plugin to enforce accessibility rules
- [ ] Monthly dependency audit (`npm audit`) and update cycle
