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

Screens on the real API (`src/lib/api.ts`, `crmApi.ts`, `finderApi.ts`): finder (map, join, manage, admin moderation), **login (OTP / admin)**, **customers** (list, new, profile with beauty profile + history, import), **services**, **staff**, **calendar** (day view, create/move/confirm/cancel, waitlist, settings) and the public booking page **`/s/<salon-slug>`**. They sit behind `LiveGate` (real session required, redirects to `/login?next=…`).

Everything else (dashboard, cashier, loyalty, SMS, …) still runs on the localStorage prototype (`src/lib/db.ts`) — so those screens don't see the real customers/appointments yet; they move over as their backend modules are built. For local OTP login without spending SMS credit run the server with `SMS_DRIVER=console` and read the code from its log (set `SEED_OWNER_PHONE` + `npm run db:seed` first).

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

### Login & payments

- **OTP login** (`POST /auth/otp/request` → `/auth/otp/verify`): 6-digit code by SMS via Limo SMS (`SMS_DRIVER=limosms`; use `console` in dev to print the code in the server log instead of spending credit). Only active users with that phone get an SMS; the response is identical for unknown numbers. Codes live 2 min, are single-use, lock after 5 wrong guesses, resend cooldown 60 s. Admins create owners/staff with `POST /admin/users`; `SEED_OWNER_PHONE` seeds a demo owner.
- **Payments** (Zarinpal, sandbox by default): `POST /tenant/payments` starts a plan purchase/renewal or add-on purchase — the amount is computed from DB prices, never sent by the client. The gateway returns to `/api/v1/payments/zarinpal/callback`, which verifies with Zarinpal, then grants the plan/add-on exactly once (replays are no-ops) and redirects to `/payment/result`. Payment rows are kept for reconciliation (`APPLY_FAILED` marks paid-but-not-applied).

Backend modules so far: `finder` (reference, platform-scoped), and the tenant-scoped CRM core — `customers`, `staff` (weekly schedule, leaves, OTP invite, enforces `Plan.limits.staff`) `services` (staff assignment), `calendar` (below) and `cashier` (below). Every query is scoped by the session's tenant, deletes are owner-only archives, and the entitlement guard comes from the registry. PATCH schemas must not carry defaults (zod's `.partial()` keeps them) — see `customers/schemas.ts`. Not built yet: backend routes for the other modules, refunds, and tying finder listing plans (artist/salon) to payment (admins still approve them manually).
