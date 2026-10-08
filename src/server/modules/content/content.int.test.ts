// Integration (seeded DB): posting calendar rules, context, isolation, roles.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { addDays, tehranNow } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {}; let A: Who, AS: Who, B: Who, FREE: Who;
const TODAY = tehranNow().date;
const post = (o: Record<string, unknown> = {}, w = AS) => call(w, "POST", "/content/posts", { kind: "OFFER", caption: "پیشنهاد ویژه‌ی این هفته برای مشتریان عزیز", tags: ["#سالن"], ...o });

beforeAll(async () => {
  const stamp = Date.now(), salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } }), free = await prisma.plan.findUniqueOrThrow({ where: { code: "free" } });
  for (const [k, plan] of [["a", salon], ["b", salon], ["free", free]] as const) T[k] = (await prisma.tenant.create({ data: { name: `cnt-${k}`, slug: `cnt-${k}-${stamp}`, subscription: { create: { planId: plan.id, status: "ACTIVE" } } } })).id;
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["customers", "staff", "services", "content"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
  const st = (await call(A, "POST", "/staff", { name: "مریم" })).body.data.id;
  await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 500_000, durationMin: 60, staffIds: [st] });
  await call(A, "POST", "/customers", { name: "سارا", phone: "09401110001", birthDate: "1990-10-07" }); // this Jalali month (مهر) — see below
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.contentPost.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});

describe("content calendar", () => {
  it("is gated by plan", async () => {
    expect((await call(FREE, "GET", "/content/posts")).status).toBe(403);
    expect((await call(null, "GET", "/content/posts")).status).toBe(401);
  });
  it("provides the salon context: name, active services, birthdays this Jalali month", async () => {
    const c = (await call(AS, "GET", "/content/context")).body.data;
    expect(c.salon).toBe("cnt-a");
    expect(c.services).toEqual([expect.objectContaining({ name: "رنگ ریشه", price: 500_000 })]);
    expect(typeof c.birthdaysThisMonth).toBe("number");
  });
  it("saves drafts, validates caption and scheduling", async () => {
    expect((await post({ caption: "کم" })).status).toBe(422);
    const d = (await post()).body.data;
    expect(d).toMatchObject({ status: "DRAFT", scheduledFor: null, publishedAt: null, kind: "OFFER" });
    expect((await post({ status: "SCHEDULED" })).status).toBe(400);
    expect((await post({ status: "SCHEDULED", scheduledFor: addDays(TODAY, -1) })).status).toBe(400);
    expect((await post({ status: "SCHEDULED", scheduledFor: addDays(TODAY, 2) })).body.data).toMatchObject({ status: "SCHEDULED", scheduledFor: addDays(TODAY, 2) });
  });
  it("publishing stamps the time; going back to draft clears it; PATCH leaves unsent fields alone", async () => {
    const id = (await post()).body.data.id;
    const pub = (await call(AS, "PATCH", `/content/posts/${id}`, { status: "PUBLISHED" })).body.data;
    expect(pub.status).toBe("PUBLISHED");
    expect(pub.publishedAt).toBeTruthy();
    expect(pub.caption).toContain("پیشنهاد ویژه");
    const again = (await call(AS, "PATCH", `/content/posts/${id}`, { caption: "کپشن ویرایش‌شده برای این پست" })).body.data;
    expect(again.publishedAt).toBe(pub.publishedAt); // stays published, original time kept
    expect((await call(AS, "PATCH", `/content/posts/${id}`, { status: "DRAFT" })).body.data).toMatchObject({ status: "DRAFT", publishedAt: null });
    expect((await call(AS, "PATCH", `/content/posts/${id}`, { status: "SCHEDULED" })).status).toBe(400);
  });
  it("counts scheduled posts whose day has come", async () => {
    // a post scheduled for today is due now
    await post({ status: "SCHEDULED", scheduledFor: TODAY });
    expect((await call(A, "GET", "/content/posts")).body.data.due).toBeGreaterThanOrEqual(1);
  });
  it("another salon sees and touches none of it", async () => {
    const id = (await call(A, "GET", "/content/posts")).body.data.posts[0].id;
    expect((await call(B, "GET", "/content/posts")).body.data.posts).toHaveLength(0);
    expect((await call(B, "PATCH", `/content/posts/${id}`, { caption: "هک شدی، بله" })).status).toBe(404);
    expect((await call(B, "DELETE", `/content/posts/${id}`)).status).toBe(404);
    expect((await call(A, "DELETE", `/content/posts/${id}`)).status).toBe(200);
    expect((await call(A, "DELETE", `/content/posts/${id}`)).status).toBe(404);
  });
});
