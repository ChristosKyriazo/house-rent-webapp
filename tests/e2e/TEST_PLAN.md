# E2E Test Plan
> Reference for all test scenarios across every role and feature.
> Ask Claude to run any test by its ID (e.g. "run test L-3") and watch the video in `test-results/videos/`.

---

## Roles

| Symbol | Role | Account |
|---|---|---|
| 👤 | Public (unauthenticated) | — |
| 🏠 | Owner | kaparro-test-owner@yopmail.com |
| 🏢 | Broker | kaparro-test-broker@yopmail.com |
| 🔑 | Renter | kaparro-test-renter@yopmail.com |
| ⚡ | Both (owner + renter) | kaparro-test-both@yopmail.com |

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Test implemented and passing |
| 🔲 | Scenario defined, test not yet written |

---

## L — Listings

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| L-1 | Owner creates a listing | 🏠 | ✅ `flows/01-owner-creates-listing` | Listing appears on `/homes/my-listings` with all fields correctly populated |
| L-2 | Owner edits a listing | 🏠 | 🔲 | Navigate to edit form; change title, price, description; confirm changes are saved and visible on the listing page |
| L-3 | Owner deletes a listing | 🏠 | ✅ `flows/owner-deletes-listing` | Listing disappears from `/homes/my-listings` and returns 404 on its detail page |
| L-4 | Broker creates a listing | 🏢 | ✅ `flows/broker-publishes-listing` | Listing appears on broker's `/homes/my-listings` with all fields correct |
| L-5 | Broker deletes a listing | 🏢 | ✅ `flows/broker-deletes-listing` | Listing disappears from broker's `/homes/my-listings` |
| L-6 | Owner views their listings dashboard | 🏠 | 🔲 | `/homes/my-listings` loads; shows listing count, inquiry badge, promotion status |
| L-7 | Free-tier owner blocked on 2nd listing | 🏠 | ✅ `flows/free-tier-listing-limit` | API returns 402 with `subscription_required`; UI shows upgrade prompt |
| L-8 | Free-tier broker blocked on 2nd listing | 🏢 | ✅ `flows/free-tier-listing-limit` | API returns 402 with `subscription_required`; UI shows upgrade prompt |
| L-9 | Download Excel bulk-upload template | 🏠 🏢 | 🔲 | File downloads with correct filename; columns match the accepted field list |
| L-10 | Validate Excel file before bulk upload | 🏠 🏢 | 🔲 | Valid file: green confirmation with row count. Invalid file: error list with row numbers and reason |
| L-11 | Bulk upload listings from Excel | 🏠 🏢 | 🔲 | Progress indicator appears; on completion all rows appear in `/homes/my-listings` |
| L-12 | Bulk delete listings | 🏠 🏢 | 🔲 | Select multiple listings; confirm deletion; all disappear from dashboard |
| L-13 | Promote a listing (slot) | 🏠 🏢 | 🔲 | Promoted badge appears on listing card; listing ranks higher in search results |
| L-14 | Public views a listing detail page | 👤 | 🔲 | All sections render: photos, description, specs, proximity distances, map pin, ratings |
| L-15 | Listing page shows bilingual description | 👤 | 🔲 | Greek description is visible and not empty when language toggle is used |

---

## S — Search & Discovery

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| S-1 | Browse all listings (home page) | 👤 | 🔲 | Cards load with photo, price, area; pagination or infinite scroll works |
| S-2 | Filter by city + listing type | 👤 | 🔲 | Results update immediately; URL reflects active filters; "clear filters" resets to all |
| S-3 | Filter by price range | 👤 | 🔲 | Only listings within range shown |
| S-4 | Filter by bedrooms / bathrooms | 👤 | 🔲 | Correct listings returned |
| S-5 | Filter by parking + floor | 👤 | 🔲 | Correct listings returned |
| S-6 | Map view loads and plots pins | 👤 | 🔲 | All listings have pins; clicking a pin shows preview card |
| S-7 | Map view filters sync with list | 👤 | 🔲 | Selecting an area on map filters the list sidebar |
| S-8 | AI semantic search | 🔑 ⚡ | 🔲 | Natural language query returns ranked results with match %; filters are extracted correctly |
| S-9 | AI conversational search — multi-turn | 🔑 ⚡ | 🔲 | Second message refines results from first; accumulated filters visible |
| S-10 | Search history persists | 🔑 ⚡ | 🔲 | Previous searches appear on `/homes/search` entry page on next visit |
| S-11 | Clear search history | 🔑 ⚡ | 🔲 | History is empty after clearing |
| S-12 | Save a listing | 🔑 ⚡ | 🔲 | Heart/bookmark toggles; listing appears in `/homes/saved` |
| S-13 | Remove a saved listing | 🔑 ⚡ | 🔲 | Listing disappears from `/homes/saved` |
| S-14 | Compare two listings side-by-side | 👤 | 🔲 | `/homes/compare?ids=a,b` renders both columns with all fields; differences are highlighted |
| S-15 | Compare three listings | 👤 | 🔲 | Three columns render correctly without layout break |

---

## I — Inquiries & Deal Flow

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| I-1 | Renter submits an inquiry | 🔑 | ✅ `flows/02-renter-inquires` | Inquiry appears in owner's dashboard; renter sees it in `/homes/my-inquiries` |
| I-2 | Owner approves an inquiry | 🏠 | ✅ `flows/03-owner-approves` | Status changes to approved; renter receives notification |
| I-3 | Owner dismisses an inquiry | 🏠 | 🔲 | Status changes to dismissed; listing stays active; renter notified |
| I-4 | Renter sees approved inquiry | 🔑 | 🔲 | `/homes/my-inquiries` shows approved badge and booking CTA |
| I-5 | Renter sees dismissed inquiry | 🔑 | 🔲 | `/homes/my-inquiries` shows dismissed badge; no booking CTA |
| I-6 | Owner initiates finalization | 🏠 | ✅ `flows/06-owner-finalizes` | Move-in/out dates proposed; renter receives notification |
| I-7 | Renter accepts finalization | 🔑 | ✅ `flows/07-renter-accepts-and-both-rate` | Deal status → confirmed; listing marked as finalized |
| I-8 | Renter rejects finalization | 🔑 | 🔲 | Deal status returns to approved; owner can propose new dates |
| I-9 | Owner cannot inquire on own listing | 🏠 | 🔲 | Inquiry button is hidden or disabled on owner's own listing page |
| I-10 | Broker views all inquiries across portfolio | 🏢 | 🔲 | `/homes/inquiries` shows inquiries grouped by listing |

---

## V — Viewings & Bookings

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| V-1 | Owner sets availability slots | 🏠 | ✅ `flows/04-owner-sets-availability` | Slots appear in the availability calendar on the listing |
| V-2 | Renter books a viewing slot | 🔑 | ✅ `flows/05-renter-books` | Booking confirmed; appears in `/homes/calendar` for both parties |
| V-3 | Owner edits an availability slot | 🏠 | 🔲 | Updated time is reflected; any booking on old slot is notified |
| V-4 | Owner deletes an availability slot | 🏠 | 🔲 | Slot disappears from the booking calendar |
| V-5 | Renter cancels a booking | 🔑 | 🔲 | Booking removed from calendar; slot reappears as available |
| V-6 | Double-booking prevention | 🔑 | 🔲 | Second renter trying to book the same slot gets a conflict error |
| V-7 | Owner calendar shows all viewings | 🏠 | 🔲 | `/homes/calendar` renders all upcoming bookings across all listings |
| V-8 | Renter calendar shows their bookings | 🔑 | 🔲 | `/homes/calendar` shows only renter's own bookings |

---

## R — Ratings & Reviews

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| R-1 | Renter rates broker after viewing | 🔑 | ✅ `flows/07-renter-accepts-and-both-rate` | Rating submitted; appears on owner's public profile |
| R-2 | Owner rates tenant after viewing | 🏠 | ✅ `flows/07-renter-accepts-and-both-rate` | Rating submitted; appears on renter's public profile |
| R-3 | Renter rates property at move-in | 🔑 | 🔲 | Scores for accuracy, condition, handover saved; appear on listing ratings page |
| R-4 | Renter rates property at move-out | 🔑 | 🔲 | Scores for condition change, owner fairness, recommendation saved |
| R-5 | Owner rates tenant at move-out | 🏠 | 🔲 | Scores for property care, rule adherence, would rent again saved |
| R-6 | Public views listing ratings page | 👤 | 🔲 | `/homes/ratings/[homeKey]` shows aggregated score, breakdown, and comments |
| R-7 | Public views owner ratings | 👤 | 🔲 | `/homes/ratings/[homeKey]/owner` shows owner scores |
| R-8 | Pending ratings appear after finalization | 🔑 🏠 | 🔲 | After deal is confirmed, both parties see a pending rating prompt |

---

## A — Analytics

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| A-1 | Owner views portfolio analytics | 🏠 | 🔲 | `/homes/analytics` loads funnel (views → saves → inquiries → approved → finalized), time-series chart, top areas |
| A-2 | Broker views portfolio analytics | 🏢 | 🔲 | Same as A-1 for broker account |
| A-3 | Per-listing analytics page | 🏠 🏢 | 🔲 | `/homes/[id]/analytics` shows view count, saves, inquiries, engagement over time |
| A-4 | Free-tier analytics gated | 🏠 | 🔲 | Free account sees basic stats only; upgrade prompt shown for full funnel |
| A-5 | View source breakdown | 🏠 | 🔲 | Analytics shows which source (browse/map/ai_search etc.) drives most traffic |

---

## P — Profile & Auth

| ID | Name | Role | Status | What to verify in the video |
|---|---|---|---|---|
| P-1 | New user signs up and sets role | 👤 | 🔲 | Signup → role selection → lands on correct dashboard for chosen role |
| P-2 | User logs in | 👤 | 🔲 | Login → redirected to correct home page; session persists on refresh |
| P-3 | User views own profile | 🔑 | 🔲 | `/profile` shows name, occupation, role badge, ratings summary |
| P-4 | User edits profile (name, DOB, occupation) | 🔑 | 🔲 | Changes saved; profile page reflects updates immediately |
| P-5 | Broker cannot change occupation | 🏢 | ✅ `broker.spec.ts` | Occupation field is read-only or shows locked hint |
| P-6 | Verified badge shows on profile | 🏠 🏢 | 🔲 | Badge is visible on profile page and listing cards |

---

## C — Access Control & Role Checks

| ID | Name | Role tested | Status | What to verify |
|---|---|---|---|---|
| C-1 | Renter cannot access owner dashboard | 🔑 | 🔲 | `/homes/my-listings` returns 403 or redirect to home |
| C-2 | Renter cannot create a listing | 🔑 | 🔲 | `POST /api/homes` returns 403 |
| C-3 | Owner cannot submit inquiry | 🏠 | 🔲 | Inquiry form is hidden on own listings; `POST /api/inquiries` returns 403 for own home |
| C-4 | Public cannot book a viewing | 👤 | 🔲 | `/homes/[id]/book` redirects to login |
| C-5 | Public cannot submit inquiry | 👤 | 🔲 | Inquiry CTA redirects to login |
| C-6 | Owner cannot access renter-only pages | 🏠 | 🔲 | `/homes/my-inquiries` returns 403 or empty state with role message |
| C-7 | Both-role user can switch between owner and renter views | ⚡ | ✅ `role-checks/both-dual-access` | Can access both `/homes/my-listings` and `/homes/my-inquiries` |
| C-8 | Broker can access owner analytics | 🏢 | ✅ `role-checks/broker-features` | `/homes/analytics` loads for broker |
| C-9 | Owner analytics page loads correctly | 🏠 | ✅ `role-checks/owner-analytics` | `/homes/analytics` loads for owner |

---

## N — Notifications

| ID | Name | Role | Status | What to verify |
|---|---|---|---|---|
| N-1 | Owner receives notification on new inquiry | 🏠 | 🔲 | Notification bell shows unread count; notification type is `inquiry_received` |
| N-2 | Renter receives notification on inquiry approval | 🔑 | 🔲 | Notification shows `inquiry_approved`; links to the listing |
| N-3 | Renter receives notification on inquiry dismissal | 🔑 | 🔲 | Notification shows `inquiry_dismissed` |
| N-4 | Renter receives notification when availability is set | 🔑 | 🔲 | Notification shows `availability_set`; links to booking page |
| N-5 | User marks notification as read | 🔑 | 🔲 | Unread count decreases; notification no longer highlighted |
| N-6 | User deletes a notification | 🔑 | 🔲 | Notification disappears from the list |

---

## T — Translations & AI

| ID | Name | Role | Status | What to verify |
|---|---|---|---|---|
| T-1 | Owner translates description EN → GR | 🏠 | 🔲 | Translate button calls API; Greek field is populated; rate limit enforced after N uses |
| T-2 | Listing created via test has Greek description | 🏠 🏢 | ✅ (via listing-templates fixture) | `descriptionGreek` is not null in DB; visible on listing page |
| T-3 | Heating values stored in Title Case | 🏠 🏢 | ✅ (normalizer in translations.ts) | DB shows e.g. `Central`, `Natural gas`, `Power` — not all-lowercase |

---

## F — Full End-to-End Flows (multi-step journeys)

These run as a sequence: each spec depends on the previous one having run.

| ID | Name | Roles | Status | Steps |
|---|---|---|---|---|
| F-1 | Complete rental journey | 🏠 🔑 | ✅ `flows/01 → 07` | Owner creates listing → Renter inquires → Owner approves → Owner sets availability → Renter books → Owner finalizes → Renter accepts → Both rate |
| F-2 | Broker publishes and manages listing | 🏢 | ✅ `flows/broker-*` | Broker creates listing → Broker deletes listing |
| F-3 | Free-tier upgrade wall | 🏠 🏢 | ✅ `flows/free-tier-listing-limit` | Account has 1 listing → tries to create 2nd → gets 402 → upgrade CTA visible |
| F-4 | Renter saves, compares, then inquires | 🔑 | 🔲 | Renter saves listing A → saves listing B → opens compare → submits inquiry on A |
| F-5 | Owner dismisses inquiry, renter re-inquires | 🏠 🔑 | 🔲 | Renter inquires → Owner dismisses → Renter submits second inquiry on same listing |
| F-6 | Owner rejects finalization, proposes new dates | 🏠 🔑 | 🔲 | Owner proposes finalization → Renter rejects → Owner proposes again with different dates → Renter accepts |
| F-7 | Broker bulk-uploads then promotes | 🏢 | 🔲 | Download template → fill rows → upload → validate → confirm rows created → promote one listing |
| F-8 | Full move-in / move-out rating cycle | 🏠 🔑 | 🔲 | Finalized deal → Renter rates property at move-in → Renter rates at move-out → Owner rates tenant at move-out → All ratings visible on profile pages |

---

## Summary: coverage at a glance

| Area | Total | ✅ Implemented | 🔲 To build |
|---|---|---|---|
| L Listings | 15 | 6 | 9 |
| S Search | 15 | 0 | 15 |
| I Inquiries | 10 | 5 | 5 |
| V Viewings | 8 | 2 | 6 |
| R Ratings | 8 | 2 | 6 |
| A Analytics | 5 | 0 | 5 |
| P Profile | 6 | 1 | 5 |
| C Access Control | 9 | 4 | 5 |
| N Notifications | 6 | 0 | 6 |
| T Translation/AI | 3 | 2 | 1 |
| F Full Flows | 8 | 3 | 5 |
| **Total** | **93** | **25** | **68** |
