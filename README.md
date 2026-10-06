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

- `src/server/modules/index.ts` — the registry. **To add a feature:** create `modules/<id>/manifest.ts` with `defineModule({...})`, list it here, `npm run db:seed`. Routes mount automatically under `/api/v1`; no new route files.
- `scope: "TENANT"` modules get an entitlement guard for free (plan ∪ add-on, installed, dependencies active); handlers never check plans themselves. `scope: "PLATFORM"` modules (e.g. `finder`) are public/cross-tenant.
- `src/server/platform/modules/entitlements.ts` — pure resolution logic (unit-tested). `service.ts` — install/uninstall/add-on/plan change. Plan limits & flags (staff count, leads, …) live in `Plan.limits`.
- Code owns module identity; admins own price and the plan matrix (seeding never overwrites their edits).
- Modules listed in `modules/_catalog.ts` already take part in plans/add-ons but have no backend routes yet; move each to its own folder when it gets some (`modules/finder` is the reference).

Not built yet: payment gateway (add-on purchase only records the entitlement), OTP login for owners/staff, switching the frontend from the localStorage mock (`src/lib/db.ts`, `finderListings.ts`) to this API.
