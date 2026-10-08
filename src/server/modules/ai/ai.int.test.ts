// Integration (seeded DB): the assistant answers from the salon's own data, owner-only, isolated.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { purchaseAddon } from "../../platform/modules/service";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}; let A: Who, AS: Who, B: Who, FREE: Who;
const ask = (q: string, w = A) => call(w, "POST", "/ai/ask", { question: q });

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) T[k] = (await prisma.tenant.create({ data: { name: `ai-${k}`, slug: `ai-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const t of [T.a, T.b]) await purchaseAddon(t, "ai", 1); // an add-on, in no plan
  for (const w of [A, B]) for (const m of ["customers", "cashier", "calendar", "services", "staff", "inventory", "ai"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  const st = (await call(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  const svc = (await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_000_000, materialCost: 200_000, durationMin: 60, commissionPct: 30, staffIds: [st] })).body.data.id;
  const c = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09501110001" })).body.data.id;
  await call(A, "POST", "/cashier/sales", { customerId: c, lines: [{ kind: "SERVICE", refId: svc, name: "رنگ ریشه", qty: 1, price: 1_000_000, staffId: st }], payments: [{ method: "CASH", amount: 600_000 }] });
  await prisma.customerVisit.deleteMany({ where: { tenantId: T.a } }); // the invoice above logged a visit today; make the last one old
  await prisma.customerVisit.create({ data: { tenantId: T.a, customerId: c, at: new Date(Date.now() - 60 * 86_400_000), service: "رنگ", category: "", staffName: "", price: 1 } });
  await call(A, "POST", "/inventory/products", { name: "ماسک", stock: 1, reorder: 3 });
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.product.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customerVisit.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});

describe("assistant", () => {
  it("is an owner-only add-on and validates the question", async () => {
    resetRateLimits();
    expect((await ask("فروش", FREE)).status).toBe(403);
    expect((await ask("فروش", AS)).status).toBe(403);
    expect((await call(null, "POST", "/ai/ask", { question: "فروش" })).status).toBe(401);
    expect((await ask("؟")).status).toBe(422);
  });
  it("answers with this salon's real numbers", async () => {
    resetRateLimits();
    expect((await ask("فروش امروز چقدر بوده؟")).body.data.text).toContain("۱,۰۰۰,۰۰۰");
    expect((await ask("بدهی مشتریان چقدر است")).body.data).toMatchObject({ topic: "debt", bullets: [expect.stringContaining("سارا")] });
    expect((await ask("به چه مشتری‌هایی پیام بدهم؟")).body.data.bullets[0]).toContain("سارا محمدی");
    expect((await ask("کدام خدمت سودآورتر است؟")).body.data.text).toContain("رنگ ریشه");
    expect((await ask("کدام کالاها تمام شده؟")).body.data.bullets[0]).toContain("ماسک");
    expect((await ask("بهترین متخصص ما کیست؟")).body.data.text).toContain("مریم");
    expect((await ask("فردا ظرفیت خالی دارم؟")).body.data.topic).toBe("capacity");
    expect((await ask("چرا فروش کم شده؟")).body.data.topic).toBe("sales");
  });
  it("unknown questions get the help list, and another salon sees none of this data", async () => {
    resetRateLimits();
    expect((await ask("هوا چطوره؟")).body.data).toMatchObject({ topic: "help" });
    expect((await ask("به چه مشتری‌هایی پیام بدهم؟", B)).body.data.text).toContain("نیست");
    expect((await ask("بدهی مشتریان", B)).body.data.text).toContain("هیچ");
  });
});
