# Exir Beauty

Salon CRM + public beauty-pro finder (Next.js 16, React 19, Tailwind 4, Persian/RTL).

## Backend

Lives in this repo (`src/server`, API at `/api/v1`), PostgreSQL + Prisma, one database with `tenantId` on tenant rows.

```bash
cp .env.example .env        # fill DATABASE_URL, AUTH_SECRET, SEED_ADMIN_PASSWORD
npm run db:migrate          # create/upgrade tables
npm run db:seed             # plans, module catalog + plan matrix, super-admin, demo tenant
npm run dev
npm test                    # unit tests · npm run test:int needs the seeded DB
```

### Modular architecture

Every feature is a **module**: a manifest + its routes + its services in `src/server/modules/<id>/`.
Plans don't contain code; they are rows in a plan → module matrix, so features can be moved between plans,
sold as add-ons, or switched off per tenant without touching module code.

- `src/server/modules/index.ts` — the registry, **one folder per module** (`manifest.ts` + routes + services). **To add a feature:** create `modules/<id>/manifest.ts` with `defineModule({...})`, list it here, `npm run modules:sync`. Routes mount automatically under `/api/v1`; no new route files.
- **Versioning:** each manifest has a semver `version` + `changelog`. `modules:sync` hashes the module's folder; if the code changed but the version didn't it refuses (nothing is applied). Bump with `npm run modules:bump <id> <patch|minor|major> "what changed"`, then sync — every release is stored in `ModuleVersion` (history in `GET /api/v1/admin/modules/:id/versions`).
- **Per-module lifecycle:** tenants install/uninstall each module independently (`/tenant/modules/:id/install|uninstall|addon`, with optional `onInstall`/`onUninstall` hooks in the manifest); admins edit price / add-on availability or globally disable a module (`PATCH /admin/modules/:id`).
- `scope: "TENANT"` modules get an entitlement guard for free (plan ∪ add-on, installed, dependencies active); handlers never check plans themselves. `scope: "PLATFORM"` modules (e.g. `finder`) are public/cross-tenant.
- `src/server/platform/modules/entitlements.ts` — pure resolution logic (unit-tested). `service.ts` — install/uninstall/add-on/plan change. Plan limits & flags (staff count, leads, …) live in `Plan.limits`.
- Code owns module identity; admins own price and the plan matrix (seeding never overwrites their edits).
- Modules listed in `modules/_catalog.ts` already take part in plans/add-ons but have no backend routes yet; move each to its own folder when it gets some (`modules/finder` is the reference).

### Frontend ↔ API

Screens on the real API (`src/lib/api.ts`, `crmApi.ts`, `finderApi.ts`): finder (map, join, manage, admin moderation), **login (OTP / admin)**, **customers** (list, new, profile with beauty profile + history, import), **services**, **staff**, **calendar** (day view, create/move/confirm/cancel, waitlist, settings, “issue invoice” from an appointment), **cashier** (invoices with split payments, debts, expenses, report, day closing) and the public booking page **`/s/<salon-slug>`**. They sit behind `LiveGate` (real session required, redirects to `/login?next=…`).

Everything else (dashboard, campaigns, reviews, …) still runs on the localStorage prototype (`src/lib/db.ts`) — so those screens don't see the real customers/appointments yet; they move over as their backend modules are built. For local OTP login without spending SMS credit run the server with `SMS_DRIVER=console` and read the code from its log (set `SEED_OWNER_PHONE` + `npm run db:seed` first).

### Calendar & booking

Dates are the salon's local calendar (`YYYY-MM-DD` + minutes from midnight, Asia/Tehran); weekdays run Saturday = 0 … Friday = 6. All scheduling rules are pure functions in `modules/calendar/availability.ts` (unit-tested): salon hours ∩ staff hours, days off, leaves, breaks, existing appointments, slot grid, minimum notice.

- **No double booking, even under concurrency:** a PostgreSQL `EXCLUDE` constraint (`appt_no_overlap`, needs the `btree_gist` extension — created by the migration, which requires a privileged DB role once) rejects overlapping active appointments for a staff member; the API turns it into `409 SLOT_TAKEN`.
- Status flow `PENDING → CONFIRMED → IN_SERVICE → DONE` (+ `CANCELED`/`NO_SHOW`); transitions are claimed atomically, and `DONE` writes the customer's service history exactly once.
- **Public online booking** (`/api/v1/public/salons/:slug/…`, no login): only for salons whose plan has `directBooking` and who left online booking on; per-IP/phone rate limits, a cap of 3 open online bookings per phone, minimum-notice and 120-day horizon; the caller gets a receipt, never internal records. Artist-plan salons receive requests through the finder instead.

### Cashier

Whole-toman money; every rule is checked twice — in code (`modules/cashier/money.ts`, pure and unit-tested) and by database `CHECK` constraints (`total = subtotal − discount`, `paid + debt ≤ total`, positive amounts). The client never sends a total: it is computed server-side.

- Invoices with split payments (cash/card/online; wallet and gift card are rejected until their modules exist), per-salon atomic numbering, debt for known customers, commission snapshotted per line (service commission → staff default).
- **From an appointment:** `POST /cashier/sales {apptId}` derives the line, marks the appointment done (which writes the customer's history once) and a unique index allows one active invoice per appointment; voiding frees it for a corrected one. Walk-ins with a customer write their service lines to the history instead.
- Debt collection settles the customer's oldest invoices first under a row lock (parallel payments can't spend the same debt); an invoice that already received debt payments can't be voided.
- **Day closing:** the server computes expected cash (cash sales + cash debt collections − cash expenses); a closed day locks invoices, voids, expenses and debt payments dated that day until an owner reopens it. Report and per-staff commission: `GET /cashier/summary`. Staff may invoice; voids, expenses, totals and closing are owner-level.

### SMS
- **Credit** is prepaid whole toman per salon (`SmsAccount`, never negative — also a DB CHECK). A message costs `parts × sell price` (platform setting `sms.pricing`, default 190; 70 chars for part one, 67 each after). Salons buy **packages** (price + bonus %) through Zarinpal (`POST /sms/topup`, payment kind `SMS_TOPUP`); admins manage pricing/packages and can adjust credit (`/admin/sms/*`, audited).
- **Sending** reserves a `SmsMessage` row, debits atomically, calls the gateway, and refunds on failure — a failure never costs the salon and concurrent sends never overdraw. Without credit the message is `BLOCKED` (nothing sent or charged).
- **Scenarios** (confirm, moved, cancel, 24h/2h reminder, thanks, birthday) are editable templates per salon. They react to **domain events** (`platform/events.ts`: `appointment.created|status|moved`, delivered only to modules active for that tenant; a failing listener never breaks the booking). A partial unique index guarantees each automatic message goes out once per (kind, appointment).
- **Reminders & birthdays** are time-based: have a scheduler call `POST /api/v1/sms/cron/run` (and `/api/v1/campaigns/cron/run`) with header `x-cron-secret: $CRON_SECRET` every ~10 minutes (idempotent; closed when `CRON_SECRET` is unset).
- Not built yet: customer opt-out, dedicated sender lines, campaigns.

### Customer club (loyalty)
- Per-salon config (tiers, earn rules, rewards, cashback) with defaults until the owner edits it; changes apply to later invoices only.
- **Earning** reacts to the cashier's `sale.created` event: visit bonus + points per amount spent (on values after the invoice discount) and capped cashback (% of what was paid outside the wallet) credited to the customer's **wallet**. `sale.voided` reverses both (clamped at zero if already spent). A unique index makes each invoice earn/reverse at most once, so replays are harmless.
- **Tier** comes from lifetime earned points and never drops. The cashier offers the tier's discount with one click.
- **Wallet** is a cashier payment method (`WALLET`): it is debited under a row lock in the *same transaction* as the invoice (insufficient balance → nothing is created), refunded in the same step on void, and reported separately in the cashier summary (never counted as cash in the drawer).
- **Rewards**: wallet rewards credit instantly; "free service/product" rewards spend points and are honoured by the cashier. Owners can adjust points/wallet manually with a reason (audited). Points/wallet can't go negative (DB CHECK).
- Not built yet: wallet top-up by cash/card (it would need to feed the daily cash report), gift cards, birthday/referral/review points.

### Navigation & modules in the UI
The sidebar, the "locked module" screen and `/modules` read the signed-in salon's real entitlements (`GET /tenant/modules`: plan ∪ add-ons, installed, dependencies) through `EntitlementsProvider`. Locked screens offer install, add-on purchase through Zarinpal, or plan upgrade; `/modules` shows real versions and installs/uninstalls through the API. Without a session the UI falls back to the prototype's local state, so the demo still works.

### Scheduled work
`scripts/cron.sh` calls the three scheduled endpoints (SMS reminders & birthdays, campaigns, store commissions/expiry) with `CRON_SECRET`; run it every ~10 minutes from any scheduler. Nothing runs on its own.

### Settings
`/settings` (signed in) is live: salon name/city (`GET/PATCH /tenant`, owner-only edit), working hours and online-booking rules (the calendar's settings API), and subscription — current plan/expiry, renew or change plan through Zarinpal (`POST /tenant/payments`), recent payments. Also live: my profile (name), brand colour (applied across the app at once) and notification toggles (the SMS scenarios). Logo upload is live (see Images).

### Dashboard (reports module)
`GET /reports/dashboard` (owner-level) rolls up today's sales vs the same weekday last week, appointments, how full the day is (bookable minutes minus breaks vs booked), new/returning customers, a 7-day revenue series, service share + margin (30 days), top staff and the day's opportunities (inactive customers, unconfirmed appointments, unpaid debt). The home page and the top-bar SMS credit chip now read real data. Excel export and period reports are still to come.

### Inventory
- Products (retail / consumable) with price, last purchase cost, reorder point and supplier. **Stock changes only through the ledger** (`StockMove`): receiving, owner corrections ("count was X", with a reason, audited) and invoices — never by editing the product, and never below zero (DB CHECK).
- The cashier's `sale.created` event deducts every PRODUCT line that points at a product (same product on several lines is summed); `sale.voided` restores exactly what was taken. A sale of more than is in stock takes what's there, records the shortfall and never blocks the till. Each invoice deducts/restores at most once (unique index), so replays are harmless. Deleting a product archives it.
- The cashier offers a "product from stock" picker when the module is on. Consumable usage per service and purchase orders to suppliers are not built yet.

### Campaigns
- The audience is chosen by combinable rules: days since last visit, minimum lifetime spend, a service they've had, Jalali birthday month, and loyalty tier (needs the loyalty module). A **preview** returns the head-count, sample names, the exact cost (parts × sell price) and whether credit covers it; sending is refused up front when it doesn't, and when the list is empty or over 500 (campaigns send synchronously for now).
- Sending goes through the SMS module (per-message charge/refund, once per campaign+customer). A customer receives at most **2 campaign messages per rolling 30 days**; the rest are counted as skipped. Campaigns can be **scheduled** (salon-local date+time, up to 60 days ahead) and canceled until they start; a scheduler calls `POST /api/v1/campaigns/cron/run` with `x-cron-secret` (claim-then-send, so overlapping runs never double-send).
- History shows sent/failed/skipped and the **sales those recipients made in the 5 days after** the send. Not built: opt-out lists, A/B tests, a background queue for very large audiences.

### Reviews
After an invoice with a service line, if the salon switched on the "review request" SMS scenario (off by default), the customer gets a personal link `/r/<secret>` (only a hash of the secret is stored). One answer per link (atomic claim); ratings at or above the salon's threshold (default 4) are invited to be public, lower ones reach the owner privately as complaints that can be replied to and resolved. Per-staff averages and a rating distribution are shown. Links die if the salon uninstalls the module.

### Referral
Each customer has a stable invite code. A friend who books through `/s/<slug>?ref=CODE` is attached to the referrer (public booking emits `referral.code`; only brand-new customers with no prior invoice, never self, never re-pointed). On the friend's first paid invoice the referrer earns loyalty points once (unique per friend, same transaction as the points) and the cashier offers the friend a first-invoice discount. Requires the loyalty module.

### Memberships
Plans have a price, a term in 30-day months, included sessions and an optional service discount. **Selling goes through the cashier** (a real invoice — it counts as revenue, unpaid parts become debt); renewing a still-valid membership of the same plan extends the term from its expiry and adds sessions. Using a session is a single conditional UPDATE (never below zero, never after expiry — also a DB CHECK). Validity is computed from dates, so nothing has to run at midnight. Voiding the invoice cancels the membership; archiving a plan keeps what was sold. The cashier offers the membership's discount on the member's invoices.

### Gift cards
Selling a card is a real cashier invoice with a `GIFT` line, so the money shows in the drawer but **is not revenue** (it's a liability; the cashier summary reports it separately as `giftSold`). Revenue is booked when the card is **spent**, as a `GIFT` payment method on a later invoice (never cash in the drawer). The code (`XXXX-XXXX-XXXX`) is a bearer secret: only a SHA-256 hash is stored, shown once at issuing and texted to the recipient when SMS is available; invoices keep `gift:<id>:<last4>`, never the code. The balance moves with one conditional UPDATE inside the invoice's transaction (can't overspend, can't double-spend), voiding an invoice refunds the card, and voiding the invoice that *sold* a card voids it only while untouched. Code lookups are POST-only and throttled per salon. Buying a card earns no loyalty points or cashback.

### Client portal
Customers sign in at `/me/login?salon=<slug>` with an SMS code **bound to that salon and phone** (a code for one salon is useless at another; resend cooldown, per-IP/per-phone throttling). First-time customers are asked for a name *after* the code is proven (without spending it) and are registered — an invite `?ref=` code attaches them to a referrer. The session role is `CUSTOMER`: it passes only routes that name that role, so a customer cannot reach any staff route (`"user"` routes exclude customers), is rechecked on each request (an archived customer loses access at once), and acts only on their own record from the session. They see and cancel appointments (inside the salon's free-cancellation window), and — when the salon runs those modules — points, tier, wallet-reward claims, wallet history, invite link and membership.

### Marketplace & network
**Marketplace** shows the salon's finder presence: listing status, how many specialists are shown (the staff `listed` flag + public bio), public rating/reviews, and the inbox of people who asked for the salon from the map (convert a lead into a customer, idempotently). **Network** lets owners request partner services (insurance, equipment, hiring, supplies…) — one open request per category (partial unique index), moving forward submitted → reviewing → answered through the platform team's queue at `/admin/network` (needs an admin session; the module is an add-on, in no plan by default).

### Academy
Courses are platform content managed by admins (`/admin/courses`, needs an admin session): audience (all / owners / specialists), price, plans that get it free, lessons. For salons the catalog filters by role; **lesson text is returned only to enrolled people**. Free and plan-included courses enroll at once (idempotent); paid ones go through Zarinpal (`COURSE` payment, the amount from the course row, enrollment created once by the verified callback). Progress is per person (distinct lessons), completion issues a certificate number shown only to its owner.

### Content
A posting calendar (draft / scheduled / published) plus salon context for the caption generator. Captions and story cards are generated in the browser; publishing happens on the salon's own social accounts (the page only tracks it). Before/after photo posts need consent and both photos.

### Images
Logos and before/after photos are small images (≤ 700 KB, PNG/JPEG/WebP only — never SVG, and the bytes must match the claimed type) resized in the browser and stored in the database (`Media`), served at `/api/v1/media/:id` by an unguessable id with `nosniff` and a restrictive CSP. A salon may keep up to 200; logo and photo ids must belong to the salon.

### Shop (store, commission, wallet) & assistant
- **Storefront** (`/store`, public): the catalog and checkout run on the API. Placing an order *reserves stock* with a conditional UPDATE per product (the last unit goes to one buyer), prices come from the database, and the shopper is sent to Zarinpal; a verified callback marks it paid once, a failed/canceled/abandoned (30 min) checkout gives the stock back.
- **Commission**: an order placed through a salon's link (`?ref=<slug>`) earns that salon each product's commission %, only while the salon runs the shop module and never on its own people's orders. The platform team (`/admin/orders`, `/admin/products`, admin session) ships/delivers/returns orders; commission is credited to the salon's **wallet** once, 7 days after delivery (`POST /shop/cron/run`), and a return before payout voids it (after payout it is clawed back, never below zero). The wallet can pay a plan renewal when it covers the whole amount.
- **Recommendations**: store products suited to the category of a customer's last service.
- **Assistant (`/ai`)**: rule-based (no language model) answers about sales, capacity, customers to win back, margins, debts, stock and top staff, computed from the salon's own data.
- Shipping is flat (free above 2,000,000 toman) and never earns commission; the admin enters a post tracking code when shipping; shoppers track by order number + phone at `/store/track`. A plan renewal can use part of the wallet and pay the rest online — the wallet part is refunded if that payment fails, is canceled or is abandoned for a day.
- Admin: warehouse view, supplier deliveries (`/admin/purchases`, stock rises in the same transaction, all lines or none), referring-salon report. Not built: the "referral marketing" admin page (still prototype — it has no defined rules yet).

### Finder listing → real salon

A published artist/salon listing can pay for its plan (`POST /finder/listings/:id/activate`, edit-code protected, Zarinpal). When the verified payment lands, `modules/finder/provision.ts` creates — in one transaction — the salon (tenant with the plan's modules and a paid-through date), an OWNER login on the listing's phone (OTP), and bookable staff (the listed people on the salon plan, otherwise the owner). Replays are no-ops; a phone that already has an account is refused *before* charging. From then on the dashboard is the source of truth: the map shows the salon's live staff with deep links to its booking page (`/s/<slug>?staff=<id>`, salon plan only — artist plan keeps request/lead forms), and finder edits no longer touch staff.

### Login & payments

- **OTP login** (`POST /auth/otp/request` → `/auth/otp/verify`): 6-digit code by SMS via Limo SMS (`SMS_DRIVER=limosms`; use `console` in dev to print the code in the server log instead of spending credit). Only active users with that phone get an SMS; the response is identical for unknown numbers. Codes live 2 min, are single-use, lock after 5 wrong guesses, resend cooldown 60 s. Admins create owners/staff with `POST /admin/users`; `SEED_OWNER_PHONE` seeds a demo owner.
- **Payments** (Zarinpal, sandbox by default; the sandbox payment page itself needs a card + CAPTCHA, so complete that step by hand when trying it locally): `POST /tenant/payments` starts a plan purchase/renewal or add-on purchase — the amount is computed from DB prices, never sent by the client. The gateway returns to `/api/v1/payments/zarinpal/callback`, which verifies with Zarinpal, then grants the plan/add-on exactly once (replays are no-ops) and redirects to `/payment/result`. Payment rows are kept for reconciliation (`APPLY_FAILED` marks paid-but-not-applied).

Backend modules so far: `finder` (reference, platform-scoped), and the tenant-scoped CRM core — `customers`, `staff` (weekly schedule, leaves, OTP invite, enforces `Plan.limits.staff`) `services` (staff assignment), `calendar` (below) and `cashier` (below). Every query is scoped by the session's tenant, deletes are owner-only archives, and the entitlement guard comes from the registry. PATCH schemas must not carry defaults (zod's `.partial()` keeps them) — see `customers/schemas.ts`. Not built yet: backend routes for the other modules, refunds, and tying finder listing plans (artist/salon) to payment (admins still approve them manually).
