// Integration (seeded DB): invoices, split payments, debt, expenses, day closing, reports, isolation, roles, appointment link.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { addDays, tehranNow, weekdayOf } from "../calendar/availability";

type Who = { role: "OWNER" | "STAFF" | "SUPER_ADMIN"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie, ...headers }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  return { status: r.status, body: await r.json() };
};

const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;
let staffId: string, svcId: string, c1: string, c2: string;
const TODAY = tehranNow().date;
const svcLine = (extra = {}) => ({ kind: "SERVICE", refId: svcId, name: "رنگ ریشه", qty: 1, price: 1_000_000, staffId, ...extra });
const sale = (who: Who, o: Record<string, unknown> = {}) => call(who, "POST", "/cashier/sales", { customerId: c1, lines: [svcLine()], payments: [{ method: "CASH", amount: 1_000_000 }], ...o });
const nextOpenDay = () => { let d = addDays(TODAY, 2); while (weekdayOf(d) === 6) d = addDays(d, 1); return d; };

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `cash-${k}`, slug: `cash-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  // The cashier is an installable (non-core) module: a salon must install it before use.
  for (const w of [A, B]) expect((await call(w, "POST", "/tenant/modules/cashier/install", {})).status).toBe(200);
  staffId = (await call(A, "POST", "/staff", { name: "مریم", commissionPct: 30 })).body.data.id;
  svcId = (await call(A, "POST", "/services", { category: "مو", name: "رنگ ریشه", price: 1_000_000, durationMin: 60, commissionPct: 40, staffIds: [staffId] })).body.data.id;
  c1 = (await call(A, "POST", "/customers", { name: "سارا محمدی", phone: "09121110001" })).body.data.id;
  c2 = (await call(A, "POST", "/customers", { name: "نیلوفر صادقی", phone: "09121110002" })).body.data.id;
  T.bCust = (await call(B, "POST", "/customers", { name: "مشتری ب", phone: "09121110003" })).body.data.id;
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free, T.rep].filter(Boolean);
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.expense.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.debtPayment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.dayClosing.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.appointment.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.service.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.staff.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "cashier." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});

describe("access", () => {
  it("needs login, the cashier module, and the right role", async () => {
    expect((await call(null, "GET", "/cashier/sales")).status).toBe(401);
    expect((await call(FREE, "GET", "/cashier/sales")).body.error.code).toBe("MODULE_NOT_ACTIVE");
    expect((await call(AS, "POST", "/cashier/sales", { customerId: c1, lines: [svcLine()], payments: [{ method: "CASH", amount: 1_000_000 }] })).status).toBe(200); // cashier staff may invoice
    expect((await call(AS, "GET", "/cashier/summary?from=" + TODAY)).status).toBe(403);
    expect((await call(AS, "POST", "/cashier/expenses", { title: "x", amount: 1000, method: "CASH" })).status).toBe(403);
    expect((await call(AS, "POST", `/cashier/days/${TODAY}/close`, { countedCash: 0 })).status).toBe(403);
  });
});

describe("invoices", () => {
  it("computes totals server-side, keeps split payments, snapshots commission", async () => {
    const r = await sale(A, { lines: [svcLine({ qty: 2 }), { kind: "PRODUCT", name: "شامپو", qty: 1, price: 200_000 }], discountPct: 10, payments: [{ method: "CASH", amount: 1_000_000 }, { method: "CARD", amount: 880_000 }, { method: "ONLINE", amount: 100_000 }], total: 1 }); // the client-sent total is ignored
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ subtotal: 2_200_000, discount: 220_000, total: 1_980_000, paid: 1_980_000, debt: 0, status: "PAID" });
    expect(r.body.data.code).toMatch(/^F-\d+$/);
    expect(r.body.data.lines.find((l: { kind: string }) => l.kind === "SERVICE").commissionPct).toBe(40); // service-level commission
    expect(r.body.data.lines.find((l: { kind: string }) => l.kind === "PRODUCT").commissionPct).toBe(0);
    expect(r.body.data.payments).toHaveLength(3);
  });

  it("rejects bad invoices", async () => {
    expect((await sale(A, { payments: [{ method: "CASH", amount: 1_000_001 }] })).body.error.code).toBe("OVERPAID");
    expect((await sale(A, { customerId: null, payments: [{ method: "CASH", amount: 500_000 }] })).body.error.code).toBe("DEBT_NEEDS_CUSTOMER");
    // Wallet payments need the loyalty module (covered in loyalty.int.test.ts); here the salon hasn't installed it.
    expect((await sale(A, { payments: [{ method: "WALLET", amount: 1000 }] })).status).toBe(403);
    expect((await sale(A, { payments: [{ method: "GIFT", amount: 1000 }] })).status).toBe(422);
    expect((await sale(A, { lines: [] })).status).toBe(400);
    expect((await sale(A, { lines: [svcLine({ qty: 0 })] })).status).toBe(422);
    expect((await sale(A, { discountPct: 101 })).status).toBe(422);
    expect((await sale(A, { lines: [svcLine({ staffId: "nope" })] })).status).toBe(400);
    expect((await sale(A, { lines: [svcLine({ refId: "nope" })] })).status).toBe(400);
    expect((await sale(A, { customerId: T.bCust })).status).toBe(400); // another salon's customer
    expect((await sale(A, { payments: [{ method: "CASH", amount: -5 }] })).status).toBe(422);
  });

  it("numbers invoices atomically: parallel requests never share a number", async () => {
    const rs = await Promise.all(Array.from({ length: 10 }, () => sale(A)));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    const nums = rs.map((r) => r.body.data.number).sort((a: number, b: number) => a - b);
    expect(new Set(nums).size).toBe(10);
    expect(nums[9] - nums[0]).toBe(9); // contiguous
  });

  it("walk-in service lines become the customer's history", async () => {
    await sale(A, { customerId: c2, lines: [svcLine({ price: 800_000 })], payments: [{ method: "CARD", amount: 800_000 }] });
    const v = (await call(A, "GET", `/customers/${c2}`)).body.data;
    expect(v.visits).toHaveLength(1);
    expect(v.visits[0]).toMatchObject({ service: "رنگ ریشه", price: 800_000 });
  });
});

describe("debt", () => {
  let d1: string, d2: string;
  it("an unpaid balance becomes customer debt, listed and aggregated", async () => {
    const cust = (await call(A, "POST", "/customers", { name: "بدهکار", phone: "09121119999" })).body.data.id;
    T.debtor = cust;
    const a = await sale(A, { customerId: cust, payments: [{ method: "CASH", amount: 400_000 }] });
    expect(a.body.data).toMatchObject({ status: "DEBT", debt: 600_000, paid: 400_000 });
    d1 = a.body.data.id;
    d2 = (await sale(A, { customerId: cust, lines: [svcLine({ price: 300_000 })], payments: [] })).body.data.id;
    const list = (await call(A, "GET", "/cashier/debts")).body.data.filter((x: { customerId: string }) => x.customerId === cust);
    expect(list).toEqual([expect.objectContaining({ debt: 900_000, invoices: 2 })]);
  });

  it("collecting settles the oldest invoice first and tracks partial payments", async () => {
    const p = await call(A, "POST", "/cashier/debts/pay", { customerId: T.debtor, amount: 700_000, method: "CASH" });
    expect(p.body.data).toMatchObject({ remainingDebt: 200_000, settledInvoices: 1 });
    expect((await call(A, "GET", `/cashier/sales/${d1}`)).body.data).toMatchObject({ debt: 0, status: "PAID" });
    expect((await call(A, "GET", `/cashier/sales/${d2}`)).body.data).toMatchObject({ debt: 200_000, status: "DEBT" });
    expect((await call(A, "POST", "/cashier/debts/pay", { customerId: T.debtor, amount: 200_001, method: "CASH" })).body.error.code).toBe("OVERPAID");
  });

  it("two simultaneous payments can't spend the same debt", async () => {
    const rs = await Promise.all([1, 2, 3].map(() => call(A, "POST", "/cashier/debts/pay", { customerId: T.debtor, amount: 100_000, method: "CARD" })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(2); // 200,000 left → exactly two of three succeed
    expect(rs.filter((r) => r.status === 409)).toHaveLength(1);
    expect((await call(A, "GET", "/cashier/debts")).body.data.find((x: { customerId: string }) => x.customerId === T.debtor)).toBeUndefined();
  });

  it("an invoice that already received debt payments can't be voided silently", async () => {
    expect((await call(A, "POST", `/cashier/sales/${d1}/void`, { reason: "اشتباه" })).body.error.code).toBe("HAS_DEBT_PAYMENTS");
  });
});

describe("void", () => {
  it("voids with a reason (owners only), is final, and drops out of totals and debts", async () => {
    const s = (await sale(A, { customerId: c2, payments: [{ method: "CASH", amount: 100_000 }] })).body.data;
    expect((await call(AS, "POST", `/cashier/sales/${s.id}/void`, { reason: "اشتباه ثبت" })).status).toBe(403);
    expect((await call(A, "POST", `/cashier/sales/${s.id}/void`, { reason: "" })).status).toBe(422);
    const v = await call(A, "POST", `/cashier/sales/${s.id}/void`, { reason: "اشتباه ثبت شد" });
    expect(v.body.data).toMatchObject({ status: "VOID", voidReason: "اشتباه ثبت شد", debt: 0 });
    expect((await call(A, "POST", `/cashier/sales/${s.id}/void`, { reason: "دوباره" })).body.error.code).toBe("ALREADY_VOID");
    expect((await call(A, "GET", "/cashier/debts")).body.data.find((x: { customerId: string }) => x.customerId === c2)).toBeUndefined();
  });
});

describe("appointments", () => {
  const D = nextOpenDay();
  let appt: string;
  it("an invoice from an appointment derives its lines, marks it done, records history once, and can't repeat", async () => {
    const id = (await call(A, "POST", "/calendar/appointments", { customerId: c1, staffId, serviceId: svcId, date: D, startMin: 600, status: "PENDING" })).body.data.id;
    expect((await call(A, "POST", "/cashier/sales", { apptId: id, payments: [] })).body.error.code).toBe("BAD_APPOINTMENT_STATUS"); // still pending
    await call(A, "POST", `/calendar/appointments/${id}/confirm`, {});
    const before = (await call(A, "GET", `/customers/${c1}`)).body.data.visits.length;
    const r = await call(A, "POST", "/cashier/sales", { apptId: id, payments: [{ method: "CARD", amount: 1_000_000 }] });
    expect(r.body.data).toMatchObject({ customerId: c1, apptId: id, total: 1_000_000, status: "PAID" });
    expect(r.body.data.lines[0]).toMatchObject({ kind: "SERVICE", name: "رنگ ریشه", staffId, commissionPct: 40 });
    expect((await call(A, "GET", `/calendar/appointments/${id}`)).body.data.status).toBe("DONE");
    expect((await call(A, "GET", `/customers/${c1}`)).body.data.visits.length).toBe(before + 1);
    expect((await call(A, "POST", "/cashier/sales", { apptId: id, payments: [{ method: "CARD", amount: 1_000_000 }] })).body.error.code).toBe("APPOINTMENT_ALREADY_INVOICED");
    appt = r.body.data.id;
    // voiding frees the appointment for a corrected invoice
    await call(A, "POST", `/cashier/sales/${appt}/void`, { reason: "قیمت اشتباه" });
    const again = await call(A, "POST", "/cashier/sales", { apptId: id, payments: [{ method: "CARD", amount: 900_000 }] });
    expect(again.body.data).toMatchObject({ status: "DEBT", debt: 100_000, apptId: id });
  });

  it("refuses another salon's appointment and a mismatched customer", async () => {
    const id = (await call(A, "POST", "/calendar/appointments", { customerId: c2, staffId, serviceId: svcId, date: D, startMin: 720 })).body.data.id;
    expect((await call(B, "POST", "/cashier/sales", { apptId: id, payments: [] })).status).toBe(400);
    expect((await call(A, "POST", "/cashier/sales", { apptId: id, customerId: c1, payments: [] })).status).toBe(400);
  });
});

describe("isolation", () => {
  it("one salon never sees or touches another's money", async () => {
    const s = (await sale(A)).body.data.id;
    expect((await call(B, "GET", `/cashier/sales/${s}`)).status).toBe(404);
    expect((await call(B, "POST", `/cashier/sales/${s}/void`, { reason: "هک کردن" })).status).toBe(404);
    expect((await call(B, "GET", `/cashier/sales?date=${TODAY}`)).body.data).toEqual([]);
    expect((await call(B, "POST", "/cashier/debts/pay", { customerId: c1, amount: 1000, method: "CASH" })).status).toBe(404);
    expect((await call(B, "GET", `/cashier/summary?from=${TODAY}`)).body.data).toMatchObject({ count: 0, revenue: 0 });
    const e = (await call(A, "POST", "/cashier/expenses", { title: "اجاره", amount: 1000, method: "CASH" })).body.data.id;
    expect((await call(B, "DELETE", `/cashier/expenses/${e}`)).status).toBe(404);
  });
});

describe("expenses, report and day closing", () => {
  it("builds the report from invoices, debt collections and expenses", async () => {
    // fresh salon so the numbers are exact
    const t = (await prisma.tenant.create({ data: { name: "cash-rep", slug: `cash-rep-${Date.now()}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: "salon" } })).id, status: "ACTIVE" } } } })).id;
    T.rep = t;
    const R: Who = { role: "OWNER", tenantId: t };
    await call(R, "POST", "/tenant/modules/cashier/install", {});
    const st = (await call(R, "POST", "/staff", { name: "پرسنل گزارش", commissionPct: 30 })).body.data.id;
    const sv = (await call(R, "POST", "/services", { category: "مو", name: "خدمت", price: 1_000_000, durationMin: 60, commissionPct: 40, staffIds: [st] })).body.data.id;
    const cu = (await call(R, "POST", "/customers", { name: "مشتری گزارش", phone: "09121118888" })).body.data.id;
    const line = (price: number) => ({ kind: "SERVICE", refId: sv, name: "خدمت", qty: 1, price, staffId: st });

    await call(R, "POST", "/cashier/sales", { customerId: cu, lines: [line(1_000_000), { kind: "PRODUCT", name: "ماسک", qty: 1, price: 200_000 }], discountPct: 10, payments: [{ method: "CASH", amount: 400_000 }, { method: "CARD", amount: 680_000 }] }); // total 1,080,000
    await call(R, "POST", "/cashier/sales", { customerId: cu, lines: [line(500_000)], payments: [{ method: "CASH", amount: 200_000 }] }); // 300,000 debt
    await call(R, "POST", "/cashier/debts/pay", { customerId: cu, amount: 100_000, method: "CASH" });
    await call(R, "POST", "/cashier/expenses", { title: "خرید مواد", amount: 50_000, method: "CASH" });
    await call(R, "POST", "/cashier/expenses", { title: "قبض", amount: 30_000, method: "CARD" });
    const voided = (await call(R, "POST", "/cashier/sales", { customerId: cu, lines: [line(999_000)], payments: [{ method: "CASH", amount: 999_000 }] })).body.data.id;
    await call(R, "POST", `/cashier/sales/${voided}/void`, { reason: "اشتباه" });

    const s = (await call(R, "GET", `/cashier/summary?from=${TODAY}`)).body.data;
    expect(s).toMatchObject({ count: 2, revenue: 1_580_000, services: 1_500_000, products: 200_000, discounts: 120_000, cash: 600_000, card: 680_000, online: 0, newDebt: 300_000, debtCollected: 100_000, expenses: 80_000, net: 1_500_000, cashExpected: 600_000 + 100_000 - 50_000 });
    // commission = 40% of each service line's discounted value: (900,000 + 500,000) * 0.4
    expect(s.byStaff).toEqual([expect.objectContaining({ staffId: st, name: "پرسنل گزارش", revenue: 1_400_000, commission: 560_000 })]);

    // closing: expected cash is computed by the server; the counted amount is recorded with the difference
    const closed = await call(R, "POST", `/cashier/days/${TODAY}/close`, { countedCash: 640_000, note: "کسری ۱۰ هزار" });
    expect(closed.body.data).toMatchObject({ closed: true, closing: { expectedCash: 650_000, countedCash: 640_000, difference: -10_000 } });
    expect((await call(R, "POST", `/cashier/days/${TODAY}/close`, { countedCash: 1 })).body.error.code).toBe("DAY_CLOSED");

    // a closed day is locked for everything dated that day
    expect((await call(R, "POST", "/cashier/sales", { customerId: cu, lines: [line(1000)], payments: [{ method: "CASH", amount: 1000 }] })).body.error.code).toBe("DAY_CLOSED");
    expect((await call(R, "POST", "/cashier/expenses", { title: "دیر", amount: 1000, method: "CASH" })).body.error.code).toBe("DAY_CLOSED");
    expect((await call(R, "POST", "/cashier/debts/pay", { customerId: cu, amount: 1000, method: "CASH" })).body.error.code).toBe("DAY_CLOSED");
    const first = (await call(R, "GET", `/cashier/sales?date=${TODAY}&status=PAID`)).body.data[0];
    expect((await call(R, "POST", `/cashier/sales/${first.id}/void`, { reason: "بعد از بستن" })).body.error.code).toBe("DAY_CLOSED");
    const exp = (await call(R, "GET", `/cashier/expenses?from=${TODAY}`)).body.data[0];
    expect((await call(R, "DELETE", `/cashier/expenses/${exp.id}`)).body.error.code).toBe("DAY_CLOSED");

    // reopening restores normal operation
    expect((await call(R, "DELETE", `/cashier/days/${TODAY}/close`)).body.data.closed).toBe(false);
    expect((await call(R, "DELETE", `/cashier/days/${TODAY}/close`)).status).toBe(404);
    expect((await call(R, "POST", "/cashier/expenses", { title: "بعد از بازگشایی", amount: 1000, method: "CASH" })).status).toBe(200);
    expect((await call(R, "GET", "/cashier/days/today")).body.data.closed).toBe(false);
  });

  it("validates expenses and day input", async () => {
    expect((await call(A, "POST", "/cashier/expenses", { title: "x", amount: 100, method: "CASH" })).status).toBe(422);
    expect((await call(A, "POST", "/cashier/expenses", { title: "کارت", amount: 100, method: "ONLINE" })).status).toBe(422);
    expect((await call(A, "POST", "/cashier/expenses", { title: "آینده", amount: 100, method: "CASH", date: addDays(TODAY, 3) })).status).toBe(400);
    expect((await call(A, "GET", "/cashier/days/2026-13-45")).status).toBe(422);
    expect((await call(A, "POST", `/cashier/days/${addDays(TODAY, 2)}/close`, { countedCash: 0 })).status).toBe(400); // can't close the future
    expect((await call(A, "GET", `/cashier/summary?from=${addDays(TODAY, -400)}&to=${TODAY}`)).status).toBe(400);
  });
});
