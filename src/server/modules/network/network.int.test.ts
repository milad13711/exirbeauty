// Integration (seeded DB): requests (one open per category), status follow-up, admin queue, isolation, roles.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { purchaseAddon } from "../../platform/modules/service";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) T[k] = (await prisma.tenant.create({ data: { name: `net-${k}`, slug: `net-${k}-${stamp}`, city: "تهران", subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free }; ADMIN = { role: "SUPER_ADMIN", tenantId: null };
  // Not in any plan: the module is an add-on, so the salons buy it first (payment itself is covered in the payments tests).
  for (const t of [T.a, T.b]) await purchaseAddon(t, "network", 1);
  for (const w of [A, B]) expect((await call(w, "POST", "/tenant/modules/network/install", {})).status).toBe(200);
});
afterAll(async () => {
  await prisma.networkRequest.deleteMany({ where: { tenantId: { in: Object.values(T) } } });
  await prisma.auditLog.deleteMany({ where: { action: "network.update" } });
  await prisma.tenant.deleteMany({ where: { id: { in: Object.values(T) } } });
});

describe("salon side", () => {
  it("is gated by plan and owner-only", async () => {
    expect((await call(FREE, "GET", "/network/requests")).status).toBe(403);
    expect((await call(null, "GET", "/network/requests")).status).toBe(401);
    expect((await call(AS, "POST", "/network/requests", { category: "بیمه" })).status).toBe(403);
    expect((await call(A, "GET", "/network/categories")).body.data).toHaveLength(10);
  });
  it("accepts only known categories and keeps one open request per category", async () => {
    expect((await call(A, "POST", "/network/requests", { category: "فضانوردی" })).status).toBe(422);
    const r = await call(A, "POST", "/network/requests", { category: "بیمه", note: "بیمه مسئولیت برای ۵ نفر" });
    expect(r.body.data).toMatchObject({ category: "بیمه", status: "SUBMITTED", note: "بیمه مسئولیت برای ۵ نفر" });
    expect((await call(A, "POST", "/network/requests", { category: "بیمه" })).body.error.code).toBe("ALREADY_OPEN");
    expect((await call(A, "POST", "/network/requests", { category: "تجهیزات" })).status).toBe(200);
    const both = await Promise.all([1, 2, 3].map(() => call(A, "POST", "/network/requests", { category: "عکاسی" })));
    expect(both.filter((x) => x.status === 200)).toHaveLength(1); // double-clicks can't flood the queue
  });
  it("another salon has its own queue", async () => {
    expect((await call(B, "POST", "/network/requests", { category: "بیمه" })).status).toBe(200);
    expect((await call(B, "GET", "/network/requests")).body.data).toHaveLength(1);
    expect((await call(A, "GET", "/network/requests")).body.data.length).toBeGreaterThanOrEqual(3);
  });
});

describe("platform team", () => {
  it("only admins can see the queue (with salon names) or change it", async () => {
    expect((await call(A, "GET", "/admin/network/requests")).status).toBe(403);
    const q = (await call(ADMIN, "GET", "/admin/network/requests")).body.data as { salon: string; category: string; id: string; tenantId: string }[];
    expect(q.some((r) => r.salon === "net-a" && r.category === "بیمه")).toBe(true);
    const mine = q.find((r) => r.tenantId === T.a && r.category === "بیمه")!;
    expect((await call(A, "PATCH", `/admin/network/requests/${mine.id}`, { status: "ANSWERED" })).status).toBe(403);
  });
  it("moves a request forward with a response; never backward; the salon sees the answer", async () => {
    const id = ((await call(ADMIN, "GET", "/admin/network/requests?status=SUBMITTED")).body.data as { tenantId: string; category: string; id: string }[]).find((r) => r.tenantId === T.a && r.category === "بیمه")!.id;
    expect((await call(ADMIN, "PATCH", `/admin/network/requests/${id}`, { status: "REVIEWING" })).body.data.status).toBe("REVIEWING");
    expect((await call(ADMIN, "PATCH", `/admin/network/requests/${id}`, { status: "REVIEWING" })).status).toBe(409);
    const done = await call(ADMIN, "PATCH", `/admin/network/requests/${id}`, { status: "ANSWERED", response: "کارشناس بیمه فردا تماس می‌گیرد." });
    expect(done.body.data).toMatchObject({ status: "ANSWERED", response: "کارشناس بیمه فردا تماس می‌گیرد." });
    expect((await call(ADMIN, "PATCH", `/admin/network/requests/${id}`, { status: "REVIEWING" })).status).toBe(409);
    expect((await call(A, "GET", "/network/requests")).body.data.find((r: { id: string }) => r.id === id).response).toContain("کارشناس");
    expect((await call(ADMIN, "PATCH", "/admin/network/requests/nope", { status: "REVIEWING" })).status).toBe(404);
  });
  it("an answered request frees the category for a new one", async () => {
    expect((await call(A, "POST", "/network/requests", { category: "بیمه" })).status).toBe(200);
  });
});
