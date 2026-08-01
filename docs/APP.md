# What kaparro does

A two-sided Greek property marketplace for rentals and sales. Renters discover listings (filters, map, or natural-language AI search), express interest, get approved, book a viewing, finalize a deal, and rate each other. Owners and brokers list properties, qualify demand, control their calendar, and close.

The arc the product is built around: **discover → inquire → approve → book → finalize → rate.** Every step has a visible status, both sides have controlled actions, and scheduling conflicts are prevented rather than detected later.

Companion docs: [README](../README.md) for setup, [docs/OPERATIONS.md](./OPERATIONS.md) for deploys and infrastructure, [tests/e2e/TEST_PLAN.md](../tests/e2e/TEST_PLAN.md) for test scenarios.

---

## Roles

`role` is one of `user`, `owner`, `both`, `broker`. It is chosen at signup via `/profile/set-role`; **broker is admin-granted**, not self-service. A `both` user toggles which role the UI presents — read `displayRole`/`isEl` from context rather than re-deriving.

Brokers have a second axis, `brokerCategory` (non-nullable, defaults to `standalone` for *every* user, so it is only meaningful when `role = 'broker'`):

| Category | Meaning |
|---|---|
| `standalone` | broker with no team, on their own subscription — the signup default |
| `parent` ("Main") | a Pro broker who has invited at least one broker; sees and manages the team |
| `child` ("Default") | an invited broker under a Main broker, whose plan the parent assigns and pays for |

The DB fact separating Main from Default is `brokerCategory`; the fact separating standalone from child is `parentBrokerId`. Use the predicates in `lib/broker-hierarchy.ts` (`isMainBroker`, `isChildBroker`, …) rather than comparing strings inline — `isChildBroker` also narrows `parentBrokerId` to non-null.

---

## Feature / route / role matrix

### 1. Listings

| Feature | Who | How |
|---|---|---|
| Create listing | Owner, Broker | `POST /api/homes` — title, bilingual description, address, rent/sale, price, beds/baths, floor, heating category+agent, parking, energy class, size, year built/renovated, available-from |
| View listing | Public | `/homes/[key]` — photos, description, owner info, proximity distances, ratings |
| Edit / delete | Owner, Broker | `PATCH` / `DELETE /api/homes/[id]` (hard delete, removes photos) |
| My listings | Owner, Broker | `GET /api/homes/my-listings` — with inquiry counts and promotion status |
| Bulk upload (Excel) | Owner, Broker | `POST /api/homes/bulk-upload`; optional AI description generation per row |
| Validate before upload | Owner, Broker | `POST /api/homes/bulk-validate` — checks columns and area names first |
| Download template | Owner, Broker | `GET /api/homes/template` |
| Bulk delete | Owner, Broker | `POST /api/homes/bulk-delete` |
| Bulk job status | Owner, Broker | `GET /api/jobs/[jobId]/status` — polled while a bulk upload runs |
| Promote listing | Owner, Broker | `POST /api/homes/promote` — subscription slot (7d Plus / 30d Pro), or paid boost |
| Upload photos | Owner, Broker | `POST /api/homes/upload` — magic-byte MIME validation |
| Track view / duration | System | `GET /api/homes/[id]/view`, `POST …/view/duration` |

### 2. Search and discovery

| Feature | Who | How |
|---|---|---|
| Filter search | Public | `GET /api/homes` |
| Browse / map / compare | Public | `/homes`, `/homes/map`, `/homes/compare?ids=…` |
| AI semantic search | Logged-in | `POST /api/homes/ai-search` — NL → hard filters + soft preferences → embedding similarity, returns match % |
| Conversational AI search | Logged-in | `POST /api/homes/ai-chat` — multi-turn, accumulates filters, rent/buy mode |
| Search history | Logged-in | `GET` / `DELETE /api/homes/search-history` |
| Save / unsave listing | Logged-in | `POST` / `DELETE /api/homes/saved`, viewed at `/homes/saved` |
| **Saved searches** | Logged-in | `/homes/saved-searches`, `GET/POST /api/saved-searches`, `/api/saved-searches/[key]` |

**Saved searches** persist either a filter snapshot (`type: 'filter'`, `filterParams`) or an AI query (`type: 'ai'`, `queryText` + `queryEmbedding` + a `softCriteria` snapshot inside `filterParams`, matched above `minMatchPercent`, default 70). When `notificationsEnabled`, `lib/saved-search-matcher.ts` notifies on new matching listings and stamps `lastNotifiedAt`. It scores the new listing with the **same** `scoreHome` used by AI search, so `minMatchPercent` is on the same scale as the percentage the user saw. Notifications are deduplicated per (user, listing) and capped at 5 per user per rolling day.

### Match scoring

`lib/search/score-home.ts` is the single scorer, shared by AI search and the saved-search matcher. Every component normalises to `[0,1]` **absolutely** — independent of the rest of the result set — and the fit is the weighted mean over only the components the query actually expressed (`semantic` .30, `distance` .25, `description` .15, `vibe` .10, `safety` .08, `photo` .07, `parking` .05, renormalised).

- **Semantic** is a first-class term, not a late bonus. Raw cosine for query-vs-listing sits around 0.20–0.50 for `text-embedding-3-small`, so `lib/search/calibration.ts` maps it through a logistic (`SEM_CENTER` 0.32, `SEM_TEMP` 0.06). Changing those constants changes what every stored `minMatchPercent` means — bump `SCORING_VERSION` with them.
- **Missing data gets a prior, never 0.** An ungeocoded listing must not outrank one known to be close.
- **Fit is not rank.** The displayed `matchPercentage` is the fit alone; freshness is added in `rankScore` for ordering only.
- **Hard-filters-only queries return `matchPercentage: null`** — every result satisfies the query completely, so there is no match signal to report and the UI says "matches your filters".

### 3. Inquiries and deal flow

| Feature | Who | How |
|---|---|---|
| Submit inquiry | Renter | `POST /api/inquiries` |
| Received inquiries | Owner, Broker | `GET /api/inquiries/owner` |
| My inquiries | Renter | `GET /api/inquiries/me` |
| Approved inquiries | Both | `GET /api/inquiries/approved` (includes finalized rows) |
| Approve / dismiss / delete | Owner, Broker | `PATCH` / `DELETE /api/inquiries/[homeKey]/[inquiryId]` |
| Initiate finalization | Owner | `POST …/finalize` — proposes move-in/out dates |
| Accept / reject finalization | Renter | `PATCH …/finalize`, `POST …/reject` |

Lifecycle: `pending → approved | dismissed → finalized`.

### 4. Viewings and bookings

| Feature | Who | How |
|---|---|---|
| Set / edit / delete availability | Owner, Broker | `POST` / `PATCH` / `DELETE /api/homes/[id]/availability` |
| View availability | Renter | `GET /api/homes/[id]/availability` — conflict-checked |
| Book a viewing | Renter | `POST /api/bookings` — optionally linked to an approved inquiry |
| My bookings | Both | `GET /api/bookings` — as attendee or host |
| Listing's bookings | Owner, Broker | `GET /api/homes/[id]/bookings` |
| Reschedule / cancel | Renter | `PATCH` / `DELETE /api/bookings/[id]` |
| Calendar | Both | `/homes/calendar` |
| Reminders | System | `POST /api/bookings/reminders` |

Booking writes run at `Serializable` isolation, and **both** the renter's and the owner's calendars are checked for conflicts.

### 5. Ratings

Five rating moments, all in `Rating.type`:

| Type | Who rates | When | Captures |
|---|---|---|---|
| `viewing_broker` | Renter | after a viewing | punctuality, helpfulness, listing accuracy |
| `viewing_tenant` | Owner, Broker | after a viewing | tenant quality |
| `movein_house` | Renter | after finalization confirmed | listing accuracy, condition, handover |
| `moveout_house` | Renter | after move-out | condition vs move-in, recommendation, owner fairness |
| `moveout_tenant` | Owner | after move-out | property care, rule adherence, would-rent-again |

Viewed at `/homes/ratings/[homeKey]`, `…/owner`, and `/profile/ratings/[userId]`. `GET /api/ratings/pending` lists what is due. `POST /api/ratings/flag/[id]` flags a rating for review. Ratings are revealed on a delay (`revealAt`) so neither side can retaliate; raters always see their own submissions.

### 6. Analytics

`/homes/analytics` (portfolio: views → saves → inquiries → approved → finalized funnel, time series, top areas and sources, via `GET /api/homes/portfolio-analytics`) and `/homes/[id]/analytics` (per listing). Free tier gets basic stats; Plus/Pro get the full funnel and time series.

`ListingView.source` is one of `browse`, `ai_search`, `filter_search`, `map`, `saved`, `compare`, `direct`.

### 7. Profiles

`/signup` and `/login` are Clerk; users are synced to a Prisma `User` by `clerkUserId` so the app can store its own fields (role, occupation, tier). `/profile`, `/profile/edit` → `PATCH /api/profile`. `POST /api/auth/set-role` sets the role once. `verified` is a manually granted flag shown on profiles and cards.

### 8. Location data

`GET /api/areas/search`, `/api/cities/search`, `/api/countries/search` — all bilingual and accent-insensitive. `POST /api/areas` (Owner/Broker) creates one. Areas are cached 5 minutes and carry safety rating and vibe tags. Proximity to metro, school, hospital, park and university is computed at listing creation via Google Maps (24h in-memory cache, 8s timeout). Admin backfills: `POST /api/admin/backfill-coordinates`, `/api/admin/backfill-bilingual`, `/api/admin/reembed-homes`.

### 9. AI

OpenAI powers description generation on bulk upload (`lib/house-description-generator.ts`, SHA-256-keyed cache), filter extraction and semantic search (`lib/filter-extraction.ts`, `lib/search/*`), and photo vision tagging on upload. Model overrides: `OPENAI_FILTER_MODEL`, `OPENAI_VISION_MODEL`, `OPENAI_HOUSE_DESCRIPTION_MODEL`, `OPENAI_COMPATIBILITY_MODEL`.

Embeddings are `text-embedding-3-small`, stored on `Home.embedding`, backed by **pgvector**, with `EmbeddingQueue` + `lib/embedding-queue-worker.ts` for async regeneration.

### 10. System

`GET /api/healthz` (liveness), `GET /api/readyz` (DB connectivity, 503 if down). Sentry captures server and client errors. `pino` logs every API request with request ID, user and duration. **Redis is live** (`lib/redis.ts`, `lib/rate-limit.ts`) for cross-process rate limiting and AI-search caching when `REDIS_URL` is set, falling back to per-process memory when it is not. Google Maps and OpenAI description caches remain per-process.

### Feature flags

`FEATURE_AI_SEARCH` and `FEATURE_BOOKINGS` (`lib/features.ts`). Set to the literal string `"false"` to disable; absent or anything else means enabled.

---

## Subscriptions and payments

Stripe is live. `lib/stripe.ts` instantiates lazily so a build without `STRIPE_SECRET_KEY` does not fail.

### Tiers

| Tier | Listings | Promotion slots | Slot duration |
|---|---|---|---|
| Free | 1 | 0 | — |
| Plus | 10 | 2 | 7 days |
| Pro | unlimited | 5 | 30 days |

Source of truth: `lib/subscription.ts` (`getListingLimit`, `getSlotLimit`, `TIER_RANK`). Gated endpoints return **`402`** with `{ error: 'subscription_required', requiredTier }`.

### Checkout

`/upgrade` → `POST /api/subscription/upgrade` → Stripe Checkout (`mode: 'subscription'`), with `metadata.userId` and `targetTier`. There is no publishable key — checkout is created server-side.

### Webhook

`POST /api/webhooks/stripe`, raw body, signature-verified, and **exempted from Clerk in `proxy.ts`** (otherwise the middleware 401s it). Handles `checkout.session.completed` and `customer.subscription.deleted`. Idempotency comes from a unique `Transaction.stripeEventId`, so a replayed event cannot double-apply.

Three purchase types are routed by session metadata: tier subscription, one-off broker boost (`boostRequestKey`), and AI credit pack.

### AI credit packs

10 credits / €2.99, 25 / €5.99, 50 / €9.99 (`AI_PACKS` in `lib/stripe.ts`). **Priced server-side** so a tampered request body cannot buy 50 credits for €2.99. Usage counters live on `User`: `aiSearchCount`, `aiSearchMonthlyCount`, `aiSearchPackCount`, `aiSearchMonthlyResetAt`, surfaced by `GET /api/ai-prompt-usage`.

### Boost

€4.99 for 30 days (`BOOST_AMOUNT_CENTS`, `BOOST_DAYS`). Distinct from subscription-slot promotion, which is included in the plan.

### Downgrade

`enforceTierListingLimits` hides the least-recently-updated listings beyond the new limit (stamping `overlimitHiddenAt`) and revokes excess promotion slots. Upgrading restores them. A Main broker with team members **cannot** downgrade — `409 team_members_present`.

### Viber alerts — not shipped

There is **no delivery pipeline**: no verified phone column on `User`, no provider, and nothing reads `viberAlertsActive` to send anything. `POST /api/subscription/viber-alerts` used to grant the paid flag to any authenticated caller for a €2.99 feature it could not deliver; it now returns `501` unless `FEATURE_VIBER_ALERTS=true`, and `402` even then.

Before this can ship: (1) `User.phone` + `phoneVerifiedAt`, OTP-verified; (2) a server-priced Stripe line item with the flag flipped **from the webhook only**; (3) a sender invoked from `createNotification` so routing lives in one place.

The upsell modal is gated on `NEXT_PUBLIC_FEATURE_VIBER_ALERTS` and now triggers on **saving a search with notifications enabled** — the moment the user has explicitly asked to be told when something happens — rather than on bookmarking a listing, which is the lowest-intent action on the site. Push-worthy events are the time-critical human-caused ones (inquiry approved/dismissed, deal finalized, viewing reminder); `new_listing_match` is in-app by default and a once-daily digest at most.

---

## Broker / agency teams

A Pro broker can build a team of up to **10** Default brokers (`TEAM_MAX_CHILDREN`; pending invites count toward the cap). `TEAM_REQUIRED_TIER = 'pro'` — building a team is gated on Pro, not granted by it.

### Invite flow

1. `POST /api/team/invite` — the Main broker picks a **tier per invitee** (never above their own) and sends an invite. This promotes the inviter to `parent` on the *first* invite sent, so the My Team surface appears immediately.
2. The invite is a link carrying a 32-byte random token, valid `INVITE_TTL_DAYS = 14`. There is no email infrastructure — the link is copied manually, plus an in-app notification if the invitee already has an account.
3. `/join-team` shows the invitation. Details load for logged-out users, and the signup is **locked to the invited email**.
4. `POST /api/team/invite/[token]/accept` attaches the child (`role: 'broker'`, `brokerCategory: 'child'`, `parentBrokerId`, assigned tier) and cancels their own Stripe subscription.

`TeamInvitation.status`: `pending | accepted | declined | expired | revoked`.

### Per-seat billing

The owner holds **one** Stripe subscription with quantity-based line items:

- `price_pro` quantity = 1 (the owner) + each Pro member
- `price_plus` quantity = each Plus member
- Free members cost nothing

`lib/team-billing.ts` — `getSeatCounts` (pure) and `syncOwnerSeats(ownerId)` — reconciles on every membership or tier change, letting Stripe prorate (`proration_behavior: 'create_prorations'`). There is **no new Checkout per member**.

`syncOwnerSeats` is deliberately **best-effort**: failures are logged, never thrown, so a Stripe hiccup cannot corrupt team membership state. Drift is repaired by the next reconcile.

### Leaving a team

A departing broker's **listings transfer to the Main broker** (reassigning `Home.userId`; inquiries and bookings follow the home). Personal ratings stay with the departing broker, who reverts to standalone/free.

### Boost requests

Default brokers cannot pay directly. Their boost button becomes "request from your team":

- `POST /api/team/boost-requests` — child requests; parent is notified (`boost_request`)
- `POST /api/team/boost-requests/[key]/approve` / `…/decline` — parent decides and pays
- `POST /api/team/boost-requests/proactive` — parent boosts a child's listing unprompted

`BoostRequest.status`: `pending | approved | rejected | expired | paid`.

### Routes and pages

Pages: `/homes/agency`, `/homes/agency/requests`, `/join-team`.

Routes under `app/api/team/`: `invite`, `invite/[token]`, `invite/[token]/accept`, `invite/[token]/decline`, `invitations/[key]`, `members/[id]`, `leave`, `overview`, `boost-requests`, `boost-requests/[key]/approve`, `boost-requests/[key]/decline`, `boost-requests/proactive`.

---

## Core business rules

The invariants the app is built on, stated plainly:

- **Time overlap** — if one meeting starts before another ends and ends after another starts, they overlap. Checked against both parties' calendars.
- **Authorization** — only the owner (or an allowed role) can perform owner actions.
- **State transition** — some actions only work when earlier steps have happened (you cannot finalize an inquiry that was never approved).
- **Deduplication** — if the same slot appears more than once, keep the safest interpretation.

Notification mutations are **service-backed** (`lib/services/*`), so route handlers stay focused on request/response. Write notifications through `createNotification` — pass `tx` inside a transaction so they commit or roll back with the rest of the work.

---

## User journeys

### Renter

1. **Discover** — filters, map, or AI search. *"I can quickly see what fits me."*
2. **Express interest** — send an inquiry; the owner is notified and the state is tracked.
3. **Get approved** — the listing moves to approved and scheduling opens up.
4. **Pick a slot and book** — overlapping appointments are blocked; both calendars respected. *"I trust that this booking is real and conflict-free."*
5. **Attend and decide** — either side can move toward finalization.
6. **Rate** — after a finalized outcome, both sides rate each other.

### Owner / Broker

1. **List and manage** homes, media and details.
2. **Review inquiries** — approve or dismiss, qualifying demand per listing.
3. **Set availability** — define viewing windows; conflict logic protects the calendar.
4. **Manage notifications** — new inquiries, bookings, finalization events, reminders.
5. **Finalize and close** once process conditions are met.

### Main broker

Everything an owner does, plus: invite Default brokers with a per-seat plan, view the team at `/homes/agency`, approve or proactively fund boosts, change a member's plan, and absorb a departing member's listings.

---

## Data model

21 models in `prisma/schema.prisma`.

| Model | Key fields |
|---|---|
| `User` | role, brokerCategory, parentBrokerId, subscriptionTier, verified, viberAlertsActive, aiSearch* counters, clerkUserId |
| `TeamInvitation` | token, inviteeEmail, tier, status, expiresAt |
| `BoostRequest` | homeId, requesterId, approverId, amountCents, days, status, proactive |
| `Home` | key, listingType, pricePerMonth, heating*, energyClass, finalized, slotPromoted, promotedUntil, overlimitHiddenAt, lat/lng, embedding |
| `Inquiry` | approved, dismissed, finalized, contactInfo (JSON) |
| `Finalization` | moveInDate, moveOutDate, status (`pending_tenant`/`confirmed`/`declined`/`cancelled`) |
| `Booking` | startTime, endTime, status, `calComBookingId` *(vestigial — Cal.com was removed; nothing writes it)* |
| `Rating` | type (5 values above), scores (JSON), revealAt, flagged |
| `Availability` | date, startTime, endTime, isAvailable |
| `Notification` | recipientId, role, type, homeKey, userId, ownerKey, inquiryId, viewed, deleted |
| `Transaction` | stripePaymentIntentId, stripeSubscriptionId, stripeCustomerId, **stripeEventId (unique — webhook dedup)** |
| `SavedHome` | userId ↔ homeId |
| `SavedSearch` | type, filterParams, queryText, queryEmbedding, minMatchPercent, notificationsEnabled |
| `Area` | bilingual name/city/country, safetyRating, vibeDescription |
| `University` | bilingual name, city, coordinates |
| `AISearchLog` | userQuery, hardFilters, softFilters, homesCountBefore/After/Final |
| `SearchLog` | query, conversation key |
| `SearchConversation` | messages (JSON), accumulatedFilters, listingMode, embedding |
| `ListingView` | source, durationSeconds, sessionId (anonymous supported) |
| `BulkUploadJob` | status, progress, total, errors (JSON) |
| `EmbeddingQueue` | homeId, status — async embedding regeneration |

---

## Notifications

| Event | Recipient | Type |
|---|---|---|
| New inquiry | Owner/Broker | `inquiry` |
| Inquiry approved | Renter | `approved` |
| Inquiry dismissed | Renter | `dismissed` |
| Inquiry rejected | Owner / Renter | `rejected` |
| Finalization proposed | Renter | `finalize` |
| Rating due | Renter | `rate` |
| Availability set | Renter | `availability_set` |
| Booking created | Owner | `booking_created` |
| Team invite | Invited broker | `team_invite` |
| Invite accepted | Main broker | `team_invite_accepted` |
| Member plan changed | Default broker | `team_tier_changed` |
| Member removed / left | Default / Main broker | `team_removed` / `team_left` |
| Boost requested / approved / declined | Main / Default broker | `boost_request` / `boost_approved` / `boost_declined` |

`GET /api/notifications` lists; `PATCH /api/notifications` marks all viewed; `DELETE /api/notifications` soft-deletes one.

---

## Testing this app

See [tests/e2e/TEST_PLAN.md](../tests/e2e/TEST_PLAN.md) for the numbered scenarios and their coverage status.
