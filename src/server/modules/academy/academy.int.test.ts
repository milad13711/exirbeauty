// Integration (seeded DB): catalog admin, audience, free/in-plan/paid enrollment, gated lesson text, progress, certificate, isolation.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { setZarinpalClient } from "../../platform/payments/zarinpal";

type Who = { userId: string; role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ name: "مریم احمدی", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}; const C: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who, ADMIN: Who;
const lessons = [{ title: "مقدمه", minutes: 10, body: "متن درس اول" }, { title: "رنگ‌کاری", minutes: 20, body: "متن درس دوم" }];

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) T[k] = (await prisma.tenant.create({ data: { name: `acd-${k}`, slug: `acd-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  A = { userId: "own-a", role: "OWNER", tenantId: T.a }; AS = { userId: "stf-a", role: "STAFF", tenantId: T.a }; B = { userId: "own-b", role: "OWNER", tenantId: T.b }; FREE = { userId: "own-f", role: "OWNER", tenantId: T.free }; ADMIN = { userId: "adm", role: "SUPER_ADMIN", tenantId: null };
  for (const w of [A, B]) expect((await call(w, "POST", "/tenant/modules/academy/install", {})).status).toBe(200);
  const mk = async (k: string, o: Record<string, unknown>) => (C[k] = (await call(ADMIN, "POST", "/admin/academy/courses", { lessons, hours: 1.5, published: true, ...o })).body.data.id);
  await mk("free", { title: "مقدمه‌ای بر مدیریت سالن", audience: "OWNER", price: 0 });
  await mk("plan", { title: "تکنیک‌های رنگ", audience: "STAFF", price: 300_000, inPlans: ["salon"] });
  await mk("paid", { title: "بازاریابی پیشرفته", audience: "ALL", price: 500_000 });
  await mk("draft", { title: "پیش‌نویس", published: false });
});
afterAll(async () => {
  setZarinpalClient(null);
  await prisma.payment.deleteMany({ where: { tenantId: { in: Object.values(T) } } });
  await prisma.enrollment.deleteMany({ where: { tenantId: { in: Object.values(T) } } });
  await prisma.course.deleteMany({ where: { id: { in: Object.values(C) } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "academy." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: Object.values(T) } } });
});

describe("catalog admin", () => {
  it("only admins manage courses, and a course needs lessons", async () => {
    expect((await call(A, "POST", "/admin/academy/courses", { title: "تقلب", lessons })).status).toBe(403);
    expect((await call(ADMIN, "POST", "/admin/academy/courses", { title: "بدون درس", lessons: [] })).status).toBe(422);
    expect((await call(ADMIN, "GET", "/admin/academy/courses")).body.data.length).toBeGreaterThanOrEqual(4);
    const r = await call(ADMIN, "PATCH", `/admin/academy/courses/${C.draft}`, { price: 1000 });
    expect(r.body.data).toMatchObject({ price: 1000, published: false, title: "پیش‌نویس" }); // unsent fields untouched
    expect((await call(ADMIN, "PATCH", "/admin/academy/courses/nope", { price: 1 })).status).toBe(404);
  });
});

describe("browsing", () => {
  it("is gated by plan; shows published courses by audience, never drafts", async () => {
    expect((await call(FREE, "GET", "/academy/courses")).status).toBe(403);
    expect((await call(null, "GET", "/academy/courses")).status).toBe(401);
    const owner = (await call(A, "GET", "/academy/courses")).body.data.map((c: { title: string }) => c.title);
    expect(owner).toContain("مقدمه‌ای بر مدیریت سالن"); expect(owner).not.toContain("تکنیک‌های رنگ"); expect(owner).not.toContain("پیش‌نویس");
    const staff = (await call(AS, "GET", "/academy/courses")).body.data.map((c: { title: string }) => c.title);
    expect(staff).toContain("تکنیک‌های رنگ"); expect(staff).not.toContain("مقدمه‌ای بر مدیریت سالن");
    expect((await call(AS, "GET", `/academy/courses/${C.free}`)).status).toBe(404); // not for specialists
    expect((await call(A, "GET", `/academy/courses/${C.draft}`)).status).toBe(404);
  });
  it("marks what is free for this salon (price 0 or included in its plan)", async () => {
    const list = (await call(AS, "GET", "/academy/courses")).body.data as { id: string; free: boolean }[];
    expect(list.find((c) => c.id === C.plan)!.free).toBe(true);
    expect(list.find((c) => c.id === C.paid)!.free).toBe(false);
  });
});

describe("learning", () => {
  it("lesson text is hidden until enrolled; free and in-plan courses enroll at once, paid ones refuse", async () => {
    const before = (await call(A, "GET", `/academy/courses/${C.free}`)).body.data;
    expect(before.enrolled).toBe(false);
    expect(before.lessons.every((l: { body?: string }) => l.body === undefined)).toBe(true);
    expect((await call(A, "POST", `/academy/courses/${C.paid}/enroll`)).status).toBe(402);
    const after = (await call(A, "POST", `/academy/courses/${C.free}/enroll`)).body.data;
    expect(after.enrolled).toBe(true);
    expect(after.lessons[0].body).toBe("متن درس اول");
    expect((await call(A, "POST", `/academy/courses/${C.free}/enroll`)).status).toBe(200); // idempotent
    expect(await prisma.enrollment.count({ where: { userId: "own-a", courseId: C.free } })).toBe(1);
    expect((await call(AS, "POST", `/academy/courses/${C.plan}/enroll`)).body.data.enrolled).toBe(true);
  });
  it("progress counts lessons once; completing all issues a certificate to that person only", async () => {
    expect((await call(A, "POST", `/academy/courses/${C.paid}/lessons/0/complete`)).status).toBe(403); // not enrolled
    expect((await call(A, "POST", `/academy/courses/${C.free}/lessons/9/complete`)).status).toBe(400);
    const one = (await call(A, "POST", `/academy/courses/${C.free}/lessons/0/complete`)).body.data;
    expect(one).toMatchObject({ progress: 50, completed: false });
    expect((await call(A, "POST", `/academy/courses/${C.free}/lessons/0/complete`)).body.data.progress).toBe(50);
    const eid = one.enrollmentId;
    expect((await call(A, "GET", `/academy/enrollments/${eid}/certificate`)).status).toBe(409);
    const done = (await call(A, "POST", `/academy/courses/${C.free}/lessons/1/complete`)).body.data;
    expect(done).toMatchObject({ progress: 100, completed: true });
    const cert = (await call(A, "GET", `/academy/enrollments/${eid}/certificate`)).body.data;
    expect(cert).toMatchObject({ course: "مقدمه‌ای بر مدیریت سالن", name: "مریم احمدی", salon: "acd-a" });
    expect(cert.serial).toMatch(/^EX-\d{4}-[A-Z0-9]{6}$/);
    expect((await call(B, "GET", `/academy/enrollments/${eid}/certificate`)).status).toBe(404); // someone else's
  });
});

describe("paid course", () => {
  it("pays online, then enrolls exactly once; free ones refuse payment", async () => {
    resetRateLimits();
    setZarinpalClient({ request: async () => ({ authority: `C${Math.random().toString(36).slice(2, 12)}` }), verify: async () => ({ code: 100, refId: "7", cardPan: "x" }), startUrl: (a) => `https://pay.test/${a}` });
    expect((await call(A, "POST", `/academy/courses/${C.free}/pay`)).status).toBe(409);
    const pay = await call(A, "POST", `/academy/courses/${C.paid}/pay`);
    expect(pay.status).toBe(200);
    expect(pay.body.data.amount).toBe(500_000);
    const authority = (await prisma.payment.findUniqueOrThrow({ where: { id: pay.body.data.paymentId } })).authority!;
    expect((await call(A, "POST", `/academy/courses/${C.paid}/enroll`)).status).toBe(402); // not yet
    const cb = `/payments/zarinpal/callback?Authority=${authority}&Status=OK`;
    await call(null, "GET", cb); await call(null, "GET", cb);
    expect(await prisma.enrollment.count({ where: { userId: "own-a", courseId: C.paid } })).toBe(1);
    expect((await prisma.enrollment.findFirstOrThrow({ where: { userId: "own-a", courseId: C.paid } })).paid).toBe(500_000);
    expect((await call(A, "POST", `/academy/courses/${C.paid}/pay`)).status).toBe(409); // already enrolled
  });
  it("salon B's people have their own enrollments", async () => {
    expect((await call(B, "GET", `/academy/courses/${C.paid}`)).body.data.enrolled).toBe(false);
  });
});
