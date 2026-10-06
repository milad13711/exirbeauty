// Integration (seeded DB). Gateways are replaced with fakes: no SMS is sent, no money moves.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../db";
import { compile, dispatch } from "../http/router";
import { resetRateLimits } from "../http/ratelimit";
import { platformRoutes } from "./routes";
import { setSmsGateway } from "./sms";
import { setZarinpalClient, type ZarinpalClient } from "./payments/zarinpal";

const table = compile(platformRoutes);
const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), table);
  const text = await r.text();
  return { status: r.status, headers: r.headers, body: text ? JSON.parse(text) : null };
};

const PHONE = "09120000001", STRANGER = "09120000002";
let sent: { to: string; text: string }[] = [];
let tenantId: string;
const lastCode = () => /(\d{6})/.exec(sent.at(-1)!.text)![1];

beforeAll(async () => {
  tenantId = (await prisma.tenant.create({ data: { name: "otp-test", slug: `otp-${Date.now()}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: "artist" } })).id, status: "ACTIVE" } } } })).id;
  await prisma.user.create({ data: { phone: PHONE, name: "مالک تست", role: "OWNER", tenantId } });
  setSmsGateway({ send: async (to, text) => { sent.push({ to, text }); } });
});
afterAll(async () => {
  setSmsGateway(null); setZarinpalClient(null);
  await prisma.otpCode.deleteMany({ where: { phone: { in: [PHONE, STRANGER] } } });
  await prisma.payment.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { phone: PHONE } });
  await prisma.tenant.delete({ where: { id: tenantId } });
});
beforeEach(async () => {
  sent = [];
  resetRateLimits();
  await prisma.otpCode.deleteMany({ where: { phone: { in: [PHONE, STRANGER] } } }); // clears the 60s cooldown between tests
});

describe("OTP login", () => {
  it("logs a registered user in with the code and sets an HttpOnly session cookie", async () => {
    expect((await call("POST", "/auth/otp/request", { phone: PHONE })).status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(PHONE);
    const r = await call("POST", "/auth/otp/verify", { phone: PHONE, code: lastCode() });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ role: "OWNER", tenantId });
    expect(r.headers.get("set-cookie")).toMatch(/exir_session=.+HttpOnly/);
  });

  it("a code works once", async () => {
    await call("POST", "/auth/otp/request", { phone: PHONE });
    const code = lastCode();
    expect((await call("POST", "/auth/otp/verify", { phone: PHONE, code })).status).toBe(200);
    expect((await call("POST", "/auth/otp/verify", { phone: PHONE, code })).status).toBe(401);
  });

  it("locks the code after 5 wrong guesses, even if the right one is then sent", async () => {
    await call("POST", "/auth/otp/request", { phone: PHONE });
    const good = lastCode();
    const wrong = good === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) expect((await call("POST", "/auth/otp/verify", { phone: PHONE, code: wrong })).status).toBe(401);
    expect((await call("POST", "/auth/otp/verify", { phone: PHONE, code: good })).status).toBe(429);
  });

  it("enforces a resend cooldown", async () => {
    await call("POST", "/auth/otp/request", { phone: PHONE });
    expect((await call("POST", "/auth/otp/request", { phone: PHONE })).status).toBe(429);
  });

  it("looks identical for unknown numbers and sends no SMS to them", async () => {
    const r = await call("POST", "/auth/otp/request", { phone: STRANGER });
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(0);
    expect((await call("POST", "/auth/otp/verify", { phone: STRANGER, code: "123456" })).status).toBe(401);
  });

  it("accepts Persian digits and rejects malformed input", async () => {
    expect((await call("POST", "/auth/otp/request", { phone: "۰۹۱۲۰۰۰۰۰۰۱" })).status).toBe(200);
    expect((await call("POST", "/auth/otp/request", { phone: "12345" })).status).toBe(422);
    expect((await call("POST", "/auth/otp/verify", { phone: PHONE, code: "12" })).status).toBe(422);
  });
});

describe("Zarinpal payments", () => {
  let verifyCode = 100, verifyCalls = 0;
  const fake: ZarinpalClient = {
    request: async ({ amount }) => ({ authority: `A${amount}-${Math.random().toString(36).slice(2, 10)}` }),
    verify: async () => { verifyCalls++; return { code: verifyCode, refId: "999", cardPan: "6037****1234" }; },
    startUrl: (a) => `https://pay.test/${a}`,
  };
  beforeEach(() => { setZarinpalClient(fake); verifyCode = 100; verifyCalls = 0; });
  const asOwner = { cookie: "" };
  beforeAll(async () => {
    await call("POST", "/auth/otp/request", { phone: PHONE });
    const r = await call("POST", "/auth/otp/verify", { phone: PHONE, code: lastCode() });
    asOwner.cookie = r.headers.get("set-cookie")!.split(";")[0];
  });
  const start = (body: unknown) => call("POST", "/tenant/payments", body, asOwner);
  const authorityOf = async (id: string) => (await prisma.payment.findUniqueOrThrow({ where: { id } })).authority!;

  it("prices a plan from the DB (the client can't set the amount) and returns the gateway URL", async () => {
    const salon = await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } });
    const r = await start({ kind: "plan", planCode: "salon", months: 3, amount: 1 });
    expect(r.status).toBe(200);
    expect(r.body.data.amount).toBe(salon.priceMonthly * 3);
    expect(r.body.data.paymentUrl).toMatch(/^https:\/\/pay\.test\//);
  });

  it("a successful callback upgrades the plan, sets the expiry, and replays do nothing", async () => {
    const { paymentId } = (await start({ kind: "plan", planCode: "salon", months: 2 })).body.data;
    const cb = `/payments/zarinpal/callback?Authority=${await authorityOf(paymentId)}&Status=OK`;
    const r1 = await call("GET", cb);
    expect(r1.status).toBe(303);
    expect(r1.headers.get("location")).toContain(`id=${paymentId}`);
    const sub1 = await prisma.subscription.findUniqueOrThrow({ where: { tenantId }, include: { plan: true } });
    expect(sub1.plan.code).toBe("salon");
    const days = (sub1.expiresAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(59); expect(days).toBeLessThan(61);

    await call("GET", cb); // browser refresh / replay
    const sub2 = await prisma.subscription.findUniqueOrThrow({ where: { tenantId } });
    expect(sub2.expiresAt!.getTime()).toBe(sub1.expiresAt!.getTime()); // not extended twice
    expect((await call("GET", `/payments/${paymentId}/status`)).body.data).toMatchObject({ status: "PAID", refId: "999" });
  });

  it("cancelling at the gateway changes nothing", async () => {
    const before = await prisma.subscription.findUniqueOrThrow({ where: { tenantId } });
    const { paymentId } = (await start({ kind: "addon", moduleId: "ai", months: 1 })).body.data;
    await call("GET", `/payments/zarinpal/callback?Authority=${await authorityOf(paymentId)}&Status=NOK`);
    expect((await call("GET", `/payments/${paymentId}/status`)).body.data.status).toBe("CANCELED");
    expect(verifyCalls).toBe(0);
    expect(await prisma.tenantModule.count({ where: { tenantId, moduleId: "ai", addon: true } })).toBe(0);
    expect(await prisma.subscription.findUniqueOrThrow({ where: { tenantId } })).toEqual(before);
  });

  it("a failed verification marks the payment failed and grants nothing", async () => {
    verifyCode = -50;
    const { paymentId } = (await start({ kind: "addon", moduleId: "ai", months: 1 })).body.data;
    await call("GET", `/payments/zarinpal/callback?Authority=${await authorityOf(paymentId)}&Status=OK`);
    expect((await call("GET", `/payments/${paymentId}/status`)).body.data).toMatchObject({ status: "FAILED", failReason: "VERIFY_-50" });
    expect(await prisma.tenantModule.count({ where: { tenantId, moduleId: "ai", addon: true } })).toBe(0);
  });

  it("a paid add-on grants the module", async () => {
    const { paymentId } = (await start({ kind: "addon", moduleId: "ai", months: 1 })).body.data;
    await call("GET", `/payments/zarinpal/callback?Authority=${await authorityOf(paymentId)}&Status=OK`);
    expect(await prisma.tenantModule.count({ where: { tenantId, moduleId: "ai", addon: true, installed: true } })).toBe(1);
  });

  it("rejects free plans, modules already in the plan, unknown ids, and anonymous callers", async () => {
    expect((await start({ kind: "plan", planCode: "free", months: 1 })).body.error.code).toBe("BAD_REQUEST");
    expect((await start({ kind: "addon", moduleId: "cashier", months: 1 })).body.error.code).toBe("ALREADY_IN_PLAN");
    expect((await start({ kind: "plan", planCode: "nope", months: 1 })).status).toBe(404);
    expect((await call("POST", "/tenant/payments", { kind: "plan", planCode: "salon", months: 1 })).status).toBe(401);
  });

  it("an unknown authority is just a failed redirect", async () => {
    const r = await call("GET", "/payments/zarinpal/callback?Authority=nonsense&Status=OK");
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toContain("r=failed");
  });
});
