// Integration (seeded DB): survey creation from invoices, SMS link, public answering (once), routing, owner replies, stats, isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setSmsGateway } from "../../platform/sms";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};

const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
let sent: { to: string; text: string }[] = [];
let staffId: string, svcId: string, cust: string;
const tokenOf = () => /\/r\/([\w-]+)/.exec(sent.at(-1)!.text)![1];
const sale = (o: Record<string, unknown> = {}) => call(A, "POST", "/cashier/sales", { customerId: cust, lines: [{ kind: "SERVICE", refId: svcId, name: "رنگ ریشه", qty: 1, price: 500_000, staffId }], payments: [{ method: "CASH", amount: 500_000 }], ...o });

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `rev-${k}`, slug: `rev-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "sms", "cashier", "reviews"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  staffId = (await call(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 500_000, durationMin: 60, staffIds: [staffId] })).body.data.id;
  cust = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09171110001" })).body.data.id;
  await call(ADMIN, "POST", "/admin/sms/adjust", { tenantId: T.a, delta: 20_000, note: "t" });
});
afterAll(async () => {
  setSmsGateway(null);
  const tenants = [T.a, T.b, T.free];
  await prisma.review.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.reviewConfig.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsMessage.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsTx.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsAccount.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.smsScenario.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => { resetRateLimits(); sent = []; setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } }); });

describe("access", () => {
  it("owner-only and plan-gated", async () => {
    expect((await call(FREE, "GET", "/reviews")).status).toBe(403);
    expect((await call(null, "GET", "/reviews")).status).toBe(401);
    expect((await call(AS, "GET", "/reviews")).status).toBe(403);
    expect((await call(AS, "GET", "/reviews/overview")).status).toBe(403);
  });
});

describe("asking for a review", () => {
  it("sends nothing while the scenario is off (the default), and leaves no dangling survey", async () => {
    await sale();
    expect(sent).toHaveLength(0);
    expect((await call(A, "GET", "/reviews")).body.data).toHaveLength(0);
  });
  it("texts a personal link after a service invoice once the scenario is on; walk-ins and product-only invoices get none", async () => {
    await call(A, "PUT", "/sms/scenarios/review", { enabled: true });
    await sale({ customerId: null });
    await sale({ lines: [{ kind: "PRODUCT", name: "ماسک", qty: 1, price: 100_000 }], payments: [{ method: "CASH", amount: 100_000 }] });
    expect(sent).toHaveLength(0);
    await sale();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("09171110001");
    expect(sent[0].text).toContain("سارا");
    expect(sent[0].text).toContain("رنگ ریشه");
    expect(sent[0].text).toMatch(/\/r\/[\w-]{20,}/);
    const rows = (await call(A, "GET", "/reviews")).body.data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rating: null, staffName: "مریم", customerName: "سارا محمدی" });
    expect((await call(A, "GET", "/reviews?status=pending")).body.data).toHaveLength(1);
  });
});

describe("answering", () => {
  let token: string;
  beforeAll(async () => {
    sent = []; setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } });
    await sale();
    token = tokenOf();
  });
  it("shows the survey (no private data) and rejects unknown links", async () => {
    const v = (await call(null, "GET", `/public/reviews/${token}`)).body.data;
    expect(v).toMatchObject({ salon: "rev-a", serviceName: "رنگ ریشه", staffName: "مریم", answered: false, threshold: 4 });
    expect(JSON.stringify(v)).not.toContain("09171110001");
    expect((await call(null, "GET", "/public/reviews/not-a-real-token-123456")).status).toBe(404);
    expect((await call(null, "POST", "/public/reviews/not-a-real-token-123456", { rating: 5 })).status).toBe(404);
  });
  it("validates the rating and accepts exactly one answer, routing by the threshold", async () => {
    expect((await call(null, "POST", `/public/reviews/${token}`, { rating: 0 })).status).toBe(422);
    expect((await call(null, "POST", `/public/reviews/${token}`, { rating: 6 })).status).toBe(422);
    const r = await call(null, "POST", `/public/reviews/${token}`, { rating: 2, comment: "رنگ یکدست نشد" });
    expect(r.body.data.route).toBe("PRIVATE");
    expect((await call(null, "POST", `/public/reviews/${token}`, { rating: 5 })).status).toBe(409);
    expect((await call(null, "GET", `/public/reviews/${token}`)).body.data).toMatchObject({ answered: true, rating: 2 });
  });
  it("two simultaneous answers: exactly one wins", async () => {
    sent = []; await sale(); const t = tokenOf();
    const rs = await Promise.all([5, 4, 3].map((rating) => call(null, "POST", `/public/reviews/${t}`, { rating })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
  });
  it("the owner sees the complaint, replies, resolves and reopens it", async () => {
    const complaint = (await call(A, "GET", "/reviews?route=PRIVATE")).body.data.find((x: { comment: string }) => x.comment === "رنگ یکدست نشد");
    expect(complaint).toMatchObject({ rating: 2, resolved: false });
    expect((await call(A, "POST", `/reviews/${complaint.id}/reply`, { text: "" })).status).toBe(422);
    expect((await call(A, "POST", `/reviews/${complaint.id}/reply`, { text: "عذرخواهی می‌کنیم؛ رایگان اصلاح می‌شود." })).body.data.reply).toContain("عذرخواهی");
    expect((await call(A, "POST", `/reviews/${complaint.id}/resolve`)).body.data.resolved).toBe(true);
    expect((await call(A, "POST", `/reviews/${complaint.id}/reopen`)).body.data.resolved).toBe(false);
  });
  it("can't reply to a survey nobody answered", async () => {
    sent = []; await sale();
    const pending = (await call(A, "GET", "/reviews?status=pending")).body.data[0];
    expect((await call(A, "POST", `/reviews/${pending.id}/reply`, { text: "سلام و ممنون" })).status).toBe(409);
  });
  it("a higher threshold turns a 4 into a private note", async () => {
    expect((await call(A, "PUT", "/reviews/config", { threshold: 1 })).status).toBe(422);
    await call(A, "PUT", "/reviews/config", { threshold: 5 });
    sent = []; await sale();
    expect((await call(null, "POST", `/public/reviews/${tokenOf()}`, { rating: 4 })).body.data.route).toBe("PRIVATE");
    await call(A, "PUT", "/reviews/config", { threshold: 4 });
  });
});

describe("overview & isolation", () => {
  it("summarizes the average, distribution, open complaints and per-staff scores", async () => {
    const o = (await call(A, "GET", "/reviews/overview")).body.data;
    expect(o.answered).toBeGreaterThanOrEqual(3);
    expect(o.dist).toHaveLength(5);
    expect(o.openPrivate).toBeGreaterThanOrEqual(1);
    expect(o.byStaff[0]).toMatchObject({ name: "مریم" });
    expect(o.pending).toBeGreaterThanOrEqual(1);
  });
  it("another salon sees none of it and can't touch it", async () => {
    expect((await call(B, "GET", "/reviews")).body.data).toHaveLength(0);
    const id = (await call(A, "GET", "/reviews")).body.data[0].id;
    expect((await call(B, "POST", `/reviews/${id}/reply`, { text: "هک شدی" })).status).toBe(404);
    expect((await call(B, "POST", `/reviews/${id}/resolve`)).status).toBe(404);
  });
  it("a salon that uninstalls the module stops collecting: its links die", async () => {
    sent = []; await sale(); const t = tokenOf();
    await call(A, "POST", "/tenant/modules/reviews/uninstall", {});
    expect((await call(null, "GET", `/public/reviews/${t}`)).status).toBe(404);
    expect((await call(null, "POST", `/public/reviews/${t}`, { rating: 5 })).status).toBe(404);
  });
});
