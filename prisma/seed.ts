import { prisma } from "../src/server/db";
import { MODULES } from "../src/server/modules";
import { DEFAULT_PLANS } from "../src/server/platform/plans";
import { hashPassword } from "../src/server/platform/auth/password";
import { syncCatalog, seedPlanMatrix } from "../src/server/platform/modules/sync";
import { createTenant } from "../src/server/platform/tenants";

async function main() {
  // Plans: create-only so admin edits to price/limits survive re-seeding.
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { code: p.code }, create: p, update: {} });
  }
  const sync = await syncCatalog(MODULES);
  console.log("modules created:", sync.created.length, sync.orphaned.length ? `| orphaned in DB (not in code): ${sync.orphaned.join(", ")}` : "");
  console.log("plan matrix seeded:", (await seedPlanMatrix(MODULES)).join(", ") || "(already set)");

  const email = process.env.SEED_ADMIN_EMAIL, password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters");
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), name: "ادمین اکسیر", role: "SUPER_ADMIN", passwordHash: await hashPassword(password) },
      update: {},
    });
    console.log("super admin ready:", email);
  } else console.log("SEED_ADMIN_EMAIL/PASSWORD not set — no admin created");

  if (process.env.NODE_ENV !== "production" && !(await prisma.tenant.findUnique({ where: { slug: "demo-salon" } }))) {
    const t = await createTenant({ name: "سالن رُز (دمو)", slug: "demo-salon", city: "تهران", planCode: "salon" });
    console.log("demo tenant:", t.id);
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
