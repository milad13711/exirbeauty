import { prisma } from "../src/server/db";
import { MODULES } from "../src/server/modules";
import { seedPlanMatrix, syncCatalog } from "../src/server/platform/modules/sync";

syncCatalog(MODULES)
  .then(async (r) => {
    console.log("new modules:", r.created.join(", ") || "-");
    console.log("released versions:", r.released.map((x) => `${x.id}@${x.version}`).join(", ") || "-");
    if (r.orphaned.length) console.log("in DB but not in code (left untouched):", r.orphaned.join(", "));
    console.log("plan matrix:", (await seedPlanMatrix(MODULES)).join(", ") || "(unchanged)");
  })
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e.message); await prisma.$disconnect(); process.exit(1); });
