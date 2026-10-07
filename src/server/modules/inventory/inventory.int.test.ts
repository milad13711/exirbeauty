// Integration (seeded DB): products, receiving, corrections, invoice deduction & void restore, concurrency, isolation, roles.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db";
import { dispatch } from "../../http/router";
import { resetRateLimits } from "../../http/ratelimit";
import { routeTable } from "../../routes";
import { signSession } from "../../platform/auth/session";
import { onSaleCreated } from "./service";

type Who = { role: "OWNER" | "STAFF"; tenantId: string | null };
const call = async (who: Who | null, method: string, path: string, body?: unknown) => {
  const cookie: Record<string, string> = who ? { cookie: `exir_session=${await signSession({ userId: "u-" + who.role, name: "t", ...who })}` } : {};
  const r = await dispatch(new Request(`http://localhost/api/v1${path}`, { method, headers: { "content-type": "application/json", ...cookie }, body: body ? JSON.stringify(body) : undefined }), path.split("?")[0].split("/").filter(Boolean), routeTable);
  const t = await r.text();
  return { status: r.status, body: t ? JSON.parse(t) : null };
};
const T: Record<string, string> = {};
let A: Who, AS: Who, B: Who, FREE: Who;
const prod = async (w: Who, id: string) => (await call(w, "GET", "/inventory/products")).body.data.find((p: { id: string }) => p.id === id);
const sell = (w: Who, productId: string, qty: number, price = 100_000) => call(w, "POST", "/cashier/sales", { lines: [{ kind: "PRODUCT", refId: productId, name: "محصول", qty, price }], payments: [{ method: "CASH", amount: price * qty }] });

beforeAll(async () => {
  const stamp = Date.now();
  for (const [k, plan] of [["a", "salon"], ["b", "salon"], ["free", "free"]] as const) {
    T[k] = (await prisma.tenant.create({ data: { name: `inv-${k}`, slug: `inv-${k}-${stamp}`, subscription: { create: { planId: (await prisma.plan.findUniqueOrThrow({ where: { code: plan } })).id, status: "ACTIVE" } } } })).id;
  }
  A = { role: "OWNER", tenantId: T.a }; AS = { role: "STAFF", tenantId: T.a }; B = { role: "OWNER", tenantId: T.b }; FREE = { role: "OWNER", tenantId: T.free };
  for (const w of [A, B]) for (const m of ["cashier", "inventory"]) expect((await call(w, "POST", `/tenant/modules/${m}/install`, {})).status).toBe(200);
});
afterAll(async () => {
  const tenants = [T.a, T.b, T.free];
  await prisma.stockMove.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.product.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.sequence.deleteMany({ where: { tenantId: { in: tenants } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: "inventory." } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenants } } });
});
beforeEach(() => resetRateLimits());

describe("access", () => {
  it("is gated by plan/install and role", async () => {
    expect((await call(FREE, "GET", "/inventory/products")).status).toBe(403);
    expect((await call(null, "GET", "/inventory/products")).status).toBe(401);
    expect((await call(AS, "POST", "/inventory/products", { name: "ماسک مو" })).status).toBe(403);
    expect((await call(AS, "GET", "/inventory/overview")).status).toBe(403);
    expect((await call(AS, "GET", "/inventory/products")).status).toBe(200);
  });
});

describe("products & stock", () => {
  let id: string;
  it("creates with opening stock (recorded in the ledger) and validates", async () => {
    expect((await call(A, "POST", "/inventory/products", { name: "x" })).status).toBe(422);
    expect((await call(A, "POST", "/inventory/products", { name: "ماسک مو", price: -1 })).status).toBe(422);
    const r = await call(A, "POST", "/inventory/products", { name: "ماسک مو", price: 300_000, cost: 180_000, stock: 5, reorder: 3, supplier: "پخش الف" });
    expect(r.status).toBe(200);
    id = r.body.data.id;
    expect(r.body.data).toMatchObject({ stock: 5, low: false, kind: "RETAIL" });
    const m = (await call(A, "GET", `/inventory/products/${id}/moves`)).body.data;
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ kind: "RECEIVE", delta: 5, stockAfter: 5 });
  });
  it("PATCH leaves unsent fields alone and can't change stock", async () => {
    const r = await call(A, "PATCH", `/inventory/products/${id}`, { price: 350_000, stock: 999 });
    expect(r.body.data).toMatchObject({ price: 350_000, cost: 180_000, reorder: 3, supplier: "پخش الف", stock: 5 });
  });
  it("a consumable has no selling price", async () => {
    const r = await call(A, "POST", "/inventory/products", { name: "اکسیدان", kind: "CONSUMABLE", price: 5000, stock: 2 });
    expect(r.body.data.price).toBe(0);
  });
  it("receiving adds stock and updates the purchase cost; staff may receive", async () => {
    const r = await call(AS, "POST", `/inventory/products/${id}/receive`, { qty: 10, unitCost: 200_000 });
    expect(r.body.data).toMatchObject({ stock: 15, cost: 200_000 });
    expect((await call(A, "POST", `/inventory/products/${id}/receive`, { qty: 0 })).status).toBe(422);
  });
  it("corrections set the count with a reason and are logged", async () => {
    expect((await call(AS, "POST", `/inventory/products/${id}/adjust`, { stock: 1, note: "شمارش" })).status).toBe(403);
    expect((await call(A, "POST", `/inventory/products/${id}/adjust`, { stock: 1 })).status).toBe(422);
    const r = await call(A, "POST", `/inventory/products/${id}/adjust`, { stock: 12, note: "شمارش انبار" });
    expect(r.body.data.stock).toBe(12);
    const m = (await call(A, "GET", `/inventory/products/${id}/moves`)).body.data;
    expect(m[0]).toMatchObject({ kind: "ADJUST", delta: -3, stockAfter: 12 });
  });
  it("lists, filters low stock, and summarizes", async () => {
    await call(A, "POST", "/inventory/products", { name: "شامپو", stock: 1, reorder: 3, cost: 100_000, supplier: "پخش ب" });
    expect((await call(A, "GET", "/inventory/products?low=1")).body.data.map((p: { name: string }) => p.name).sort()).toEqual(["اکسیدان", "شامپو"]); // 2 and 1 in stock, reorder 3
    expect((await call(A, "GET", "/inventory/products?kind=CONSUMABLE")).body.data).toHaveLength(1);
    expect((await call(A, "GET", "/inventory/overview")).body.data).toMatchObject({ items: 3, low: 2, suppliers: 2 });
  });
});

describe("invoices and stock", () => {
  let id: string;
  beforeAll(async () => { id = (await call(A, "POST", "/inventory/products", { name: "سرم", price: 100_000, cost: 60_000, stock: 10 })).body.data.id; });
  it("an invoice deducts stock, once, and a void restores exactly that", async () => {
    const s = await sell(A, id, 3);
    expect(s.status).toBe(200);
    expect((await prod(A, id)).stock).toBe(7);
    await onSaleCreated(T.a, { id: s.body.data.id }); // replayed event
    expect((await prod(A, id)).stock).toBe(7);
    expect((await call(A, "POST", `/cashier/sales/${s.body.data.id}/void`, { reason: "اشتباه" })).status).toBe(200);
    expect((await prod(A, id)).stock).toBe(10);
    expect((await call(A, "POST", `/cashier/sales/${s.body.data.id}/void`, { reason: "دوباره" })).status).toBe(409);
    expect((await prod(A, id)).stock).toBe(10);
  });
  it("selling more than is in stock never goes negative; the void restores only what was taken", async () => {
    const s = await sell(A, id, 15);
    expect(s.status).toBe(200);
    expect((await prod(A, id)).stock).toBe(0);
    const m = (await call(A, "GET", `/inventory/products/${id}/moves`)).body.data;
    expect(m.find((x: { kind: string; note: string }) => x.kind === "SALE" && x.note.includes("کسری"))).toBeTruthy();
    await call(A, "POST", `/cashier/sales/${s.body.data.id}/void`, { reason: "اشتباه" });
    expect((await prod(A, id)).stock).toBe(10);
  });
  it("the same product on several lines is deducted together; unknown ids are ignored", async () => {
    const r = await call(A, "POST", "/cashier/sales", { lines: [{ kind: "PRODUCT", refId: id, name: "سرم", qty: 2, price: 100_000 }, { kind: "PRODUCT", refId: id, name: "سرم", qty: 1, price: 100_000 }, { kind: "PRODUCT", refId: "ghost", name: "ناشناس", qty: 1, price: 1000 }, { kind: "PRODUCT", name: "آزاد", qty: 1, price: 1000 }], payments: [{ method: "CASH", amount: 302_000 }] });
    expect(r.status).toBe(200);
    expect((await prod(A, id)).stock).toBe(7);
  });
  it("concurrent invoices never lose a deduction", async () => {
    const before = (await prod(A, id)).stock;
    await Promise.all(Array.from({ length: 5 }, () => sell(A, id, 1)));
    expect((await prod(A, id)).stock).toBe(before - 5);
  });
  it("a salon without the module sells freely and nothing is tracked", async () => {
    await call(B, "POST", "/tenant/modules/inventory/uninstall", {});
    expect((await sell(B, "whatever", 1)).status).toBe(200);
  });
});

describe("isolation & archiving", () => {
  it("never touches another salon's products", async () => {
    const bp = (await call(B, "GET", "/inventory/products")).body;
    expect(bp.error?.code).toBe("MODULE_NOT_ACTIVE"); // uninstalled above
    const a = (await call(A, "POST", "/inventory/products", { name: "مخصوص الف", stock: 3 })).body.data.id;
    await call(B, "POST", "/tenant/modules/inventory/install", {});
    expect((await call(B, "PATCH", `/inventory/products/${a}`, { price: 1 })).status).toBe(404);
    expect((await call(B, "POST", `/inventory/products/${a}/receive`, { qty: 5 })).status).toBe(404);
    expect((await call(B, "DELETE", `/inventory/products/${a}`)).status).toBe(404);
    expect((await call(B, "GET", "/inventory/products")).body.data).toHaveLength(0);
  });
  it("deleting archives: it leaves the list but history stays", async () => {
    const id = (await call(A, "POST", "/inventory/products", { name: "قدیمی", stock: 1 })).body.data.id;
    expect((await call(A, "DELETE", `/inventory/products/${id}`)).status).toBe(200);
    expect((await call(A, "GET", "/inventory/products")).body.data.some((p: { id: string }) => p.id === id)).toBe(false);
    expect(await prisma.stockMove.count({ where: { productId: id } })).toBe(1);
  });
});
