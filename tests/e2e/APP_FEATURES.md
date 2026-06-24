# App Feature Reference
> Use this file to plan E2E test scenarios and identify coverage gaps.

---

## 1. Listings

| # | Feature | Who | How | Details |
|---|---|---|---|---|
| 1.1 | Create listing | Owner, Broker | `POST /api/homes` | Title, description (EN+GR), address, type (rent/sale), price, bedrooms, bathrooms, floor, heating category/agent, parking, energy class, size, year built/renovated, available from date |
| 1.2 | View listing | Public | `/homes/[key]` | Photos, full description, owner info, proximity distances (metro, school, hospital), ratings |
| 1.3 | Edit listing | Owner, Broker | `PATCH /api/homes/[id]` | Any field from creation |
| 1.4 | Delete listing | Owner, Broker | `DELETE /api/homes/[id]` | Hard delete, removes photos |
| 1.5 | View my listings | Owner, Broker | `GET /api/homes/my-listings` | Shows all own listings with inquiry count, promotion status |
| 1.6 | Bulk upload (Excel) | Owner, Broker | `POST /api/homes/bulk-upload` | Upload `.xlsx` with multiple listings; optionally triggers AI description generation per row |
| 1.7 | Validate Excel before upload | Owner, Broker | `POST /api/homes/bulk-validate` | Pre-checks column structure and area names before committing |
| 1.8 | Download Excel template | Owner, Broker | `GET /api/homes/template` | Pre-filled template with all accepted columns and drop-down values |
| 1.9 | Bulk delete listings | Owner, Broker | `POST /api/homes/bulk-delete` | Delete multiple listings by ID array |
| 1.10 | Promote listing | Owner, Broker | `POST /api/homes/promote` | Subscription-slot promotion (7d or 30d depending on tier) boosts visibility in search results |
| 1.11 | Track listing view | System | `GET /api/homes/[id]/view` | Logged per session with source (browse / ai_search / map / saved / compare / direct) |
| 1.12 | Track view duration | System | `POST /api/homes/[id]/view/duration` | Client sends seconds spent on listing page |

---

## 2. Search & Discovery

| # | Feature | Who | How | Details |
|---|---|---|---|---|
| 2.1 | Filter search | Public | `GET /api/homes` | City, country, area, price range, bedrooms, bathrooms, listing type, parking, floor, heating, energy class, year built/renovated |
| 2.2 | Browse listings | Public | `/homes` | Grid + map toggle, card layout, pagination |
| 2.3 | Map view | Public | `/homes/map` | All listings plotted; click to preview; filter by area |
| 2.4 | AI semantic search | Logged-in | `POST /api/homes/ai-search` | Natural language → extracted hard filters + soft preferences → embedding similarity ranking; returns match % per result |
| 2.5 | Conversational AI search | Logged-in | `POST /api/homes/ai-chat` | Multi-turn chat refines search; accumulates filters across turns; supports rent/buy mode |
| 2.6 | Search history | Logged-in | `GET /api/homes/search-history` | Stores recent searches; surfaced on search entry page |
| 2.7 | Clear search history | Logged-in | `DELETE /api/homes/search-history` | Removes all history for current user |
| 2.8 | Compare listings | Public | `/homes/compare?ids=a,b,c` | Side-by-side table of all listing fields |
| 2.9 | Save listing | Logged-in | `POST /api/homes/saved` | Bookmark a property; shown on saved homes page |
| 2.10 | Remove saved listing | Logged-in | `DELETE /api/homes/saved?homeKey=x` | Removes bookmark |
| 2.11 | View saved listings | Logged-in | `/homes/saved` | Grid of all bookmarked properties |

---

## 3. Inquiries & Deal Flow

| # | Feature | Who | How | Details |
|---|---|---|---|---|
| 3.1 | Submit inquiry | Renter | `POST /api/inquiries` | Sends contact info (name, email, phone, preferred schedule) to owner |
| 3.2 | View received inquiries | Owner, Broker | `GET /api/inquiries/owner` | All inquiries across all properties |
| 3.3 | View my submitted inquiries | Renter | `GET /api/inquiries/me` | All inquiries the renter has sent |
| 3.4 | Approve inquiry | Owner, Broker | `PATCH /api/inquiries/[homeKey]/[inquiryId]` | Status → approved; triggers notification to renter |
| 3.5 | Dismiss inquiry | Owner, Broker | `PATCH /api/inquiries/[homeKey]/[inquiryId]` | Status → dismissed; triggers notification |
| 3.6 | Delete inquiry | Owner, Broker | `DELETE /api/inquiries/[homeKey]/[inquiryId]` | Hard delete |
| 3.7 | Initiate finalization | Owner | `POST /api/inquiries/[homeKey]/[inquiryId]/finalize` | Proposes move-in / move-out dates; creates Finalization record |
| 3.8 | Accept finalization | Renter | `PATCH /api/inquiries/[homeKey]/[inquiryId]/finalize` | Confirms dates; deal is closed (status: confirmed) |
| 3.9 | Reject finalization | Renter | `POST /api/inquiries/[homeKey]/[inquiryId]/reject` | Sends back to negotiation |

---

## 4. Viewings & Bookings

| # | Feature | Who | How | Details |
|---|---|---|---|---|
| 4.1 | Set availability slots | Owner, Broker | `POST /api/homes/[id]/availability` | Creates time windows when property is viewable |
| 4.2 | Edit availability slot | Owner, Broker | `PATCH /api/homes/[id]/availability` | Change date/time of a slot |
| 4.3 | Delete availability slot | Owner, Broker | `DELETE /api/homes/[id]/availability` | Remove a slot |
| 4.4 | View availability | Renter | `GET /api/homes/[id]/availability` | Returns open slots with conflict checking (no double-booking for either party) |
| 4.5 | Book a viewing | Renter | `POST /api/bookings` | Books a slot; optionally linked to an approved inquiry; conflict-checked |
| 4.6 | View my bookings | Both | `GET /api/bookings` | Returns bookings as attendee or as host |
| 4.7 | Reschedule booking | Renter | `PATCH /api/bookings/[id]` | Updates start/end time |
| 4.8 | Cancel booking | Renter | `DELETE /api/bookings/[id]` | Cancels the booking |
| 4.9 | Calendar view | Both | `/homes/calendar` | Full calendar of all upcoming viewings |
| 4.10 | Booking reminders | System | `POST /api/bookings/reminders` | Sends reminder notifications for upcoming viewings |

---

## 5. Ratings & Reviews

| # | Feature | Who | Trigger | Scores captured |
|---|---|---|---|---|
| 5.1 | Rate broker after viewing | Renter | After viewing | Punctuality, helpfulness, listing accuracy |
| 5.2 | Rate tenant after viewing | Owner, Broker | After viewing | Tenant quality |
| 5.3 | Rate property at move-in | Renter | After finalization confirmed | Listing accuracy, condition, handover quality |
| 5.4 | Rate property at move-out | Renter | After move-out date | Condition vs move-in, recommendation, owner fairness, move-out handling |
| 5.5 | Rate tenant at move-out | Owner | After move-out date | Property care, rule adherence, would rent again |
| 5.6 | View property ratings | Public | `/homes/ratings/[homeKey]` | Aggregated scores + comments |
| 5.7 | View owner ratings | Public | `/homes/ratings/[homeKey]/owner` | Owner-specific aggregated scores |
| 5.8 | View user ratings | Public | `/profile/ratings/[userId]` | User ratings as tenant |
| 5.9 | View pending ratings | Logged-in | `GET /api/ratings/pending` | Ratings due but not yet submitted |

---

## 6. Analytics

| # | Feature | Who | Route | Details |
|---|---|---|---|---|
| 6.1 | Portfolio analytics | Owner, Broker | `/homes/analytics` | Views funnel (views → saves → inquiries → approved → finalized), time-series, top areas, top sources |
| 6.2 | Listing analytics | Owner, Broker | `/homes/[id]/analytics` | Per-listing view count, saves, inquiries, engagement |
| 6.3 | AI search analytics | System | `AISearchLog` | Every AI search logged: raw query, extracted filters, result counts |
| 6.4 | View source tracking | System | `ListingView` | Source tagged per view (browse / ai_search / filter_search / map / saved / compare / direct) |
| 6.5 | Gated by subscription | Plan-dependent | — | Free = basic stats; Plus/Pro = full time-series and funnel |

---

## 7. User Profiles & Roles

| # | Feature | Who | How | Details |
|---|---|---|---|---|
| 7.1 | Sign up | Public | `/signup` (Clerk) | Email/password or social; synced to Prisma User |
| 7.2 | Log in | Registered | `/login` (Clerk) | Session managed by Clerk |
| 7.3 | Set role at signup | New user | `/profile/set-role` | User / Owner / Both / Broker (Broker locked — set by admin) |
| 7.4 | View profile | Public | `/profile` | Name, occupation, role badge, ratings summary |
| 7.5 | Edit profile | Self | `/profile/edit` → `PATCH /api/profile` | Name, date of birth, occupation (occupation locked for Broker) |
| 7.6 | Verified badge | System | DB flag | Manually granted; shown on profile and listing cards |

---

## 8. Subscriptions

| # | Tier | Listing limit | Promotions | Bulk upload | AI search |
|---|---|---|---|---|---|
| 8.1 | Free | 1 | None | No | Limited |
| 8.2 | Plus | More | 7-day slots | Yes | Full |
| 8.3 | Pro | More | 30-day slots | Yes | Full |

| # | Feature | Route | Details |
|---|---|---|---|
| 8.4 | Upgrade / downgrade | `/upgrade` → `POST /api/subscription/upgrade` | Plan change takes effect immediately; promotion slots revoked on downgrade |
| 8.5 | Viber alerts (renter) | `POST /api/subscription/viber-alerts` | One-time purchase; enables SMS/Viber notifications for new matching listings |
| 8.6 | Listing limit enforcement | `POST /api/homes` | Returns `402 subscription_required` with `requiredTier: plus` when free-tier limit exceeded |

---

## 9. Notifications

| # | Event | Recipient | Type |
|---|---|---|---|
| 9.1 | New inquiry received | Owner/Broker | `inquiry_received` |
| 9.2 | Inquiry approved | Renter | `inquiry_approved` |
| 9.3 | Inquiry dismissed | Renter | `inquiry_dismissed` |
| 9.4 | Finalization proposed | Renter | `finalization_requested` |
| 9.5 | Availability set (viewing available) | Renter | `availability_set` |
| 9.6 | Mark as viewed | Self | `PATCH /api/notifications` |
| 9.7 | Delete notification | Self | `PATCH /api/notifications` |

---

## 10. Location Data

| # | Feature | Route | Details |
|---|---|---|---|
| 10.1 | Search areas | `GET /api/areas/search` | English or Greek input, accent-insensitive; filters by city/country |
| 10.2 | Create area | `POST /api/areas` | Owner/Broker only; bilingual name, city, country, district |
| 10.3 | List all areas | `GET /api/areas` | Includes safety rating, vibe tags; cached 5 min |
| 10.4 | Search cities | `GET /api/cities/search` | Bilingual; filters by country |
| 10.5 | Search countries | `GET /api/countries/search` | Bilingual |
| 10.6 | Geocoding (batch admin) | `POST /api/admin/backfill-coordinates` | Google Maps geocodes all un-mapped listings |
| 10.7 | Proximity distances | Stored on listing | Closest metro, bus, school, hospital, park, university — computed at listing creation |

---

## 11. AI & Translations

| # | Feature | Route | Details |
|---|---|---|---|
| 11.1 | AI description generation | Triggered on bulk upload | OpenAI generates property description from structured fields |
| 11.2 | Translate description | `POST /api/translate-description` | Owner translates EN description → GR (rate-limited per user) |
| 11.3 | Backfill bilingual (admin) | `POST /api/admin/backfill-bilingual` | Batch translate descriptions for all listings missing Greek |
| 11.4 | Regenerate embeddings (admin) | `POST /api/admin/reembed-homes` | Rebuilds semantic search vectors for all listings |
| 11.5 | Photo vision tagging | On image upload | OpenAI Vision tags photo content; used in semantic search matching |

---

## 12. System / Ops

| # | Feature | Route | Details |
|---|---|---|---|
| 12.1 | Health check | `GET /api/healthz` | Always 200; polled every 5 s during deploy |
| 12.2 | Readiness check | `GET /api/readyz` | Tests DB connectivity; returns 503 if down |
| 12.3 | Sentry error tracking | Middleware | Both server and client errors captured |
| 12.4 | Structured logging | `pino` | All API requests logged with request ID, user, duration |
| 12.5 | In-process cache | `lib/` | Google Maps distances and OpenAI descriptions cached in memory per process (no Redis) |

---

## Key Data Models (quick reference)

| Model | Key fields |
|---|---|
| **User** | role (user/owner/broker/both), subscriptionTier (free/plus/pro), verified, viberAlertsActive |
| **Home** | key, listingType (rent/sale), pricePerMonth, heatingCategory, heatingAgent, energyClass, finalized, slotPromoted, promotedUntil, latitude/longitude, embedding |
| **Inquiry** | approved, dismissed, finalized, contactInfo (JSON) |
| **Finalization** | moveInDate, moveOutDate, status (pending_tenant / confirmed / declined / cancelled) |
| **Booking** | startTime, endTime, status (scheduled / completed / cancelled), calComBookingId |
| **Rating** | type (viewing_broker / viewing_tenant / movein_house / moveout_house / moveout_tenant), scores (JSON) |
| **Availability** | date, startTime, endTime, isAvailable |
| **SavedHome** | userId ↔ homeId |
| **Notification** | type, viewed, deleted |
| **Area** | name EN/GR, city EN/GR, country EN/GR, safetyRating, vibeDescription |
| **BulkUploadJob** | status (pending / processing / completed / failed), progress, total, errors (JSON) |
| **SearchConversation** | messages (JSON), accumulatedFilters (JSON), listingMode (rent/buy), embedding |
| **ListingView** | source, durationSeconds, sessionId (anonymous support) |
| **AISearchLog** | userQuery, hardFilters, softFilters, homesCountBefore/After/Final |
