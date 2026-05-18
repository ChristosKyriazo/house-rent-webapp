# Tech Stack

A plain-English overview of every technology in this project — what it is, why we use it, and where it shows up.

---

## Core Framework

### Next.js
**What it is:** A React framework that handles routing, server-side rendering, and API routes in one project.
**Why we use it:** It lets us build the frontend UI and the backend API in the same codebase, without needing a separate server. We use the App Router (the `app/` folder), which gives us file-based routing and server components out of the box.
**Where you see it:** Every page in `app/`, every API endpoint in `app/api/`, and `next.config.ts`.

### React
**What it is:** The JavaScript library for building user interfaces from components.
**Why we use it:** Next.js is built on top of React. All our UI — listings, forms, modals, notifications — is written as React components.
**Where you see it:** Every `.tsx` file in `app/` and `app/components/`.

### TypeScript
**What it is:** JavaScript with type annotations. The compiler catches type errors before the code runs.
**Why we use it:** With strict mode enabled, TypeScript prevents entire categories of bugs at development time — wrong field names, missing null checks, incorrect function arguments. It also makes the codebase much easier to navigate.
**Where you see it:** Every `.ts` and `.tsx` file. Configured in `tsconfig.json`.

---

## Database

### Prisma
**What it is:** A type-safe database toolkit for Node.js. You define your data models in a schema file and Prisma generates a fully-typed client to query the database.
**Why we use it:** Instead of writing raw SQL, we write clean TypeScript queries. Prisma handles migrations, schema changes, and keeps the database in sync with our code.
**Where you see it:** `prisma/schema.prisma` (data models), `lib/prisma.ts` (the shared client), and any file that imports `{ prisma }`.

### SQLite (development) / PostgreSQL (production)
**What it is:** SQLite is a lightweight file-based database. PostgreSQL is a full-featured relational database built for production workloads.
**Why we use it:** SQLite requires zero setup, so it is ideal for local development. PostgreSQL will be used in production because it handles concurrent connections, has proper locking, and scales horizontally.
**Where you see it:** `DATABASE_URL` in `.env`. The database file is `prisma/dev.db` locally.

---

## Authentication

### Clerk
**What it is:** A hosted authentication service that provides sign-up, sign-in, session management, and user management out of the box.
**Why we use it:** Building auth from scratch is complex and security-critical. Clerk handles passwords, OAuth, email verification, and JWTs so we don't have to. We sync Clerk users into our own database via `lib/auth.ts` to store app-specific fields (role, occupation, etc.).
**Where you see it:** `proxy.ts` (middleware that protects routes), `lib/auth.ts` (syncs Clerk user to our DB), `app/layout.tsx` (wraps the app in Clerk's provider), and any route that calls `getCurrentUser()`.

---

## Styling

### Tailwind CSS
**What it is:** A utility-first CSS framework. Instead of writing separate CSS files, you apply small utility classes directly in your HTML/JSX.
**Why we use it:** Fast to write, easy to maintain, and the output CSS is automatically purged to only include classes you actually use. We use version 4, which uses a PostCSS plugin instead of a config file.
**Where you see it:** The `className` props on every component. Configured via `postcss.config.mjs`.

---

## Validation

### Zod
**What it is:** A TypeScript-first schema validation library. You define the shape and constraints of data, and Zod validates it at runtime.
**Why we use it:** API routes receive data from the outside world — user input, form submissions. Zod ensures that data matches exactly what we expect before it touches the database. If it doesn't, Zod returns a clear error message automatically.
**Where you see it:** `lib/schemas/index.ts` (all schemas), `lib/api-utils.ts` (`validateBody` helper), and every POST route that calls `validateBody(...)`.

---

## AI Features

### OpenAI
**What it is:** The API for OpenAI's language models (GPT).
**Why we use it:** We use it for three features: generating property descriptions in English and Greek automatically (`lib/house-description-generator.ts`), translating descriptions between the two languages (`lib/description-translator.ts`), and powering the natural-language AI property search (`app/api/homes/ai-search/`).
**Where you see it:** `lib/house-description-generator.ts`, `lib/description-translator.ts`, `lib/ai-search-helpers.ts`, `app/api/homes/ai-search/route.ts`, `app/api/translate-description/route.ts`. Requires `OPENAI_API_KEY` in `.env`.

---

## Maps & Location

### Google Maps API
**What it is:** Google's suite of mapping and location APIs.
**Why we use it:** When an owner lists a property, we automatically calculate walking/driving distances to the nearest metro, bus stop, school, hospital, park, and university. This gives renters useful context without them having to research it themselves.
**Where you see it:** `lib/google-maps.ts`. Requires `GOOGLE_MAPS_API_KEY` in `.env`.

---

## Calendar & Bookings

### Cal.com
**What it is:** An open-source scheduling platform (like Calendly).
**Why we use it:** Owners can connect their Cal.com account so that viewing appointments are kept in sync with their personal calendar. We store Cal.com tokens per user in the database.
**Where you see it:** The `calComToken` and `calComUsername` fields on the `User` model in `prisma/schema.prisma`, and the booking-related API routes.

---

## File Handling

### xlsx
**What it is:** A library for reading and writing Excel spreadsheet files (`.xlsx`, `.xls`, `.csv`).
**Why we use it:** Owners can bulk-upload multiple property listings at once by submitting a spreadsheet. The library parses the file and we create all the listings in one go.
**Where you see it:** `app/api/homes/bulk-upload/route.ts` and `app/api/homes/template/route.ts` (which provides the Excel template to download).

---

## Testing

### Vitest
**What it is:** A fast unit and integration test runner built for modern JavaScript/TypeScript projects.
**Why we use it:** It runs our service and API unit tests. It is configured to use the same module resolution as the rest of the project (TypeScript paths, etc.), so tests behave identically to production code.
**Where you see it:** `vitest.config.ts`, all files under `tests/` except `tests/e2e/`.

### Playwright
**What it is:** A browser automation framework for end-to-end testing. It controls a real browser to simulate real user actions.
**Why we use it:** E2E tests verify that complete user flows work — logging in, searching for a property, submitting an inquiry — from the browser's perspective, not just from the API's perspective.
**Where you see it:** `playwright.config.ts`, `tests/e2e/`.

---

## Code Quality

### ESLint
**What it is:** A static analysis tool that finds problems in JavaScript/TypeScript code.
**Why we use it:** It enforces consistent code style and catches common mistakes (unused variables, unsafe patterns) before they reach production.
**Where you see it:** `eslint.config.mjs`. Run with `npm run lint`.

---

## CI/CD

### GitHub Actions
**What it is:** GitHub's built-in automation platform. Workflows are YAML files that run on events like pushes and pull requests.
**Why we use it:** Every time code is pushed or a pull request is opened, GitHub automatically runs our full quality pipeline: install → generate Prisma client → lint → typecheck → unit tests → build. This catches problems before they are merged.
**Where you see it:** `.github/workflows/ci.yml`.
