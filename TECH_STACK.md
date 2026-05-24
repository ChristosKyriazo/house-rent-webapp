# Tech Stack

A plain-English overview of every technology in this project — what it is, why we use it, and where it shows up.

---

## Core Framework

### Next.js 16
**What it is:** A React framework that handles routing, server-side rendering, and API routes in one project.
**Why we use it:** It lets us build the frontend UI and the backend API in the same codebase, without needing a separate server. We use the App Router (the `app/` folder), which gives us file-based routing and server components out of the box.
**Where you see it:** Every page in `app/`, every API endpoint in `app/api/`, and `next.config.ts`.

### React
**What it is:** The JavaScript library for building user interfaces from components.
**Why we use it:** Next.js is built on top of React. All our UI — listings, forms, modals, notifications — is written as React components.
**Where you see it:** Every `.tsx` file in `app/` and `app/components/`.

### TypeScript
**What it is:** JavaScript with type annotations. The compiler catches type errors before the code runs.
**Why we use it:** With strict mode enabled, TypeScript prevents entire categories of bugs at development time — wrong field names, missing null checks, incorrect function arguments.
**Where you see it:** Every `.ts` and `.tsx` file. Configured in `tsconfig.json`.

---

## Database

### Prisma
**What it is:** A type-safe database toolkit for Node.js. You define your data models in a schema file and Prisma generates a fully-typed client.
**Why we use it:** Instead of writing raw SQL, we write clean TypeScript queries. Prisma handles migrations and keeps the database in sync with the code.
**Where you see it:** `prisma/schema.prisma` (data models), `lib/prisma.ts` (the shared client).

### PostgreSQL (Docker locally, hosted in production)
**What it is:** A full-featured relational database built for production workloads.
**Why we use it:** Handles concurrent connections, proper locking, serializable transactions, and scales well. We run it locally via Docker to maintain full parity with production.
**Where you see it:** Started with `docker compose up db -d`. `DATABASE_URL` in `.env` points to `postgresql://postgres:postgres@localhost:5432/house_rent`.

### Docker / Docker Compose
**What it is:** A container runtime that packages software and its dependencies into isolated environments.
**Why we use it:** Gives every developer an identical PostgreSQL setup in one command, with no manual install. The production Docker image is also built from the same `Dockerfile` for full environment parity.
**Where you see it:** `docker-compose.yml` (local database + app), `Dockerfile` (production image).

---

## Authentication

### Clerk
**What it is:** A hosted authentication service providing sign-up, sign-in, session management, and user management out of the box.
**Why we use it:** Building auth from scratch is complex and security-critical. Clerk handles passwords, OAuth, email verification, and JWTs. We sync Clerk users into our own database via `lib/auth.ts` to store app-specific fields (role, occupation, etc.).
**Where you see it:** `proxy.ts` (middleware that protects routes), `lib/auth.ts`, `app/layout.tsx`, and any route that calls `getCurrentUser()`.

---

## Observability

### Sentry
**What it is:** An error monitoring and performance tracking platform.
**Why we use it:** When an unhandled exception occurs in production, Sentry captures it with full stack trace, request context, and user info — so we can fix issues before users report them.
**Where you see it:** `sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`. Configured via `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in `.env`.

### pino (structured logging)
**What it is:** A fast, JSON-structured logger for Node.js.
**Why we use it:** Every API route emits structured logs (request ID, method, path, errors) in JSON format so they can be searched and filtered in any log aggregation tool. In development, logs are pretty-printed in the terminal.
**Where you see it:** `lib/logger.ts` (the shared logger and `requestLogger` helper), imported in every API route. Configured via `LOG_LEVEL` in `.env`.

---

## Styling

### Tailwind CSS
**What it is:** A utility-first CSS framework.
**Why we use it:** Fast to write, easy to maintain, and the output CSS is automatically purged to only include classes you actually use. We use version 4 with a PostCSS plugin.
**Where you see it:** The `className` props on every component. Configured via `postcss.config.mjs`.

---

## Validation

### Zod
**What it is:** A TypeScript-first schema validation library.
**Why we use it:** API routes receive data from the outside world — user input, form submissions. Zod ensures data matches exactly what we expect before it touches the database. If it doesn't, Zod returns a clear, structured error automatically.
**Where you see it:** `lib/schemas/index.ts` (all schemas), `lib/api-utils.ts` (`validateBody` helper), and every API route handler.

---

## AI Features

### OpenAI
**What it is:** The API for OpenAI's language models (GPT).
**Why we use it:** Powers three features: generating property descriptions in English and Greek (`lib/house-description-generator.ts`), translating descriptions between the two languages, and natural-language AI property search. Generated descriptions are cached in memory to avoid redundant API calls.
**Where you see it:** `lib/house-description-generator.ts`, `lib/description-translator.ts`, `lib/ai-search-helpers.ts`. Requires `OPENAI_API_KEY` in `.env`.

---

## Maps & Location

### Google Maps API
**What it is:** Google's geocoding and places APIs.
**Why we use it:** When an owner lists a property, we automatically calculate distances to the nearest metro, bus stop, school, hospital, park, and university. Results are cached in memory for 24 hours to avoid redundant API calls and to stay within quota.
**Where you see it:** `lib/google-maps.ts`. Requires `GOOGLE_MAPS_API_KEY` in `.env`.

---

## Calendar & Bookings

### Cal.com
**What it is:** An open-source scheduling platform (like Calendly).
**Why we use it:** Owners can connect their Cal.com account so viewing appointments stay in sync with their personal calendar. OAuth tokens are encrypted at rest in the database.
**Where you see it:** `calComToken` and `calComUsername` fields on the `User` model, booking-related API routes. Requires `CALCOM_TOKEN_ENCRYPTION_KEY` in `.env`.

---

## File Handling

### xlsx
**What it is:** A library for reading Excel / CSV files.
**Why we use it:** Owners can bulk-upload multiple listings at once via spreadsheet. The library parses the file and creates all listings in one request.
**Where you see it:** `app/api/homes/bulk-upload/route.ts`, `app/api/homes/template/route.ts`.

---

## Testing

### Vitest
**What it is:** A fast unit and integration test runner built for modern TypeScript projects.
**Why we use it:** Runs our service and API unit tests with full TypeScript path support. Coverage is enforced at ≥60% on statements, branches, and lines via `vitest.config.ts`.
**Where you see it:** `vitest.config.ts`, `tests/api/`, `tests/lib/`, `tests/services/`. Run with `npm test`.

### Playwright
**What it is:** A browser automation framework for end-to-end testing.
**Why we use it:** E2E tests verify that complete user flows work from the browser's perspective — not just from the API's perspective.
**Where you see it:** `playwright.config.ts`, `tests/e2e/`. Run with `npm run test:e2e`.

---

## Code Quality

### ESLint
**What it is:** A static analysis tool that finds problems in JavaScript/TypeScript code.
**Why we use it:** Enforces consistent code style and catches common mistakes before they reach production.
**Where you see it:** `eslint.config.mjs`. Run with `npm run lint`.

---

## CI/CD

### GitHub Actions
**What it is:** GitHub's built-in automation platform.
**Why we use it:** Every push and pull request runs the full quality pipeline automatically: install → Prisma generate → lint → typecheck → unit tests → build. Merging to `main` triggers the deploy pipeline which builds and pushes a Docker image to GitHub Container Registry.
**Where you see it:** `.github/workflows/ci.yml` (quality gate), `.github/workflows/deploy.yml` (build + push + deploy).
