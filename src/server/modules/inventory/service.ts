import { Prisma, type Product } from "@prisma/client";
import { prisma } from "../../db";
import { notFound } from "../../http/errors";
import { deduct, isLow, quantities, summarize } from "./stock";

// Every query is scoped by tenantId. Stock changes only through move(), under a row lock, with a ledger row each time.

type Tx = Prisma.TransactionClient;
const view = (p: Product) => ({ id: p.id, name: p.name, kind: p.kind, price: p.price, cost: p.cost, stock: p.stock, reorder: p.reorder, supplier: p.supplier, low: isLow(p) });

async function own(tenantId: string, id: string) {
  const p = await prisma.product.findFirst({ where: { id, tenantId, archivedAt: null } });
  if (!p) throw notFound("کالا پیدا نشد");
  return p;
}

export async function list(tenantId: string, f: { kind?: "RETAIL" | "CONSUMABLE"; low?: "1" }) {
  const rows = await prisma.product.findMany({ where: { tenantId, archivedAt: null, ...(f.kind ? { kind: f.kind } : {}) }, orderBy: { name: "asc" }, take: 1000 });
  return rows.map(view).filter((p) => !f.low || p.low);
}

export async function overview(tenantId: string) {
  return summarize(await prisma.product.findMany({ where: { tenantId, archivedAt: null }, select: { stock: true, cost: true, reorder: true, supplier: true } }));
}

export async function create(tenantId: string, b: { name: string; kind: "RETAIL" | "CONSUMABLE"; price: number; cost: number; stock: number; reorder: number; supplier: string }) {
  const p = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { tenantId, ...b, price: b.kind === "CONSUMABLE" ? 0 : b.price } });
    if (b.stock > 0) await tx.stockMove.create({ data: { tenantId, productId: created.id, kind: "RECEIVE", delta: b.stock, stockAfter: b.stock, unitCost: b.cost || null, note: "موجودی اولیه" } });
    return created;
  });
  return view(p);
}

/** Stock is changed only through receive/adjust/sales, never by editing the product. */
export async function update(tenantId: string, id: string, b: { name?: string; kind?: "RETAIL" | "CONSUMABLE"; price?: number; cost?: number; reorder?: number; supplier?: string }) {
  await own(tenantId, id);
  return view(await prisma.product.update({ where: { id }, data: { ...b, ...(b.kind === "CONSUMABLE" ? { price: 0 } : {}) } }));
}

/** Archived, not deleted: past invoices and stock history keep pointing at it. */
export async function archive(tenantId: string, id: string) {
  await own(tenantId, id);
  await prisma.product.update({ where: { id }, data: { archivedAt: new Date() } });
}

// ───────── the ledger primitive ─────────

type Move = { tenantId: string; productId: string; kind: "RECEIVE" | "SALE" | "SALE_VOID" | "ADJUST"; delta?: number; setTo?: number; unitCost?: number | null; ref?: string | null; note?: string; clampTo0?: boolean };

async function move(tx: Tx, m: Move) {
  const [p] = await tx.$queryRaw<{ stock: number }[]>`SELECT "stock" FROM "Product" WHERE "id" = ${m.productId} AND "tenantId" = ${m.tenantId} FOR UPDATE`;
  if (!p) throw notFound("کالا پیدا نشد");
  const after = m.setTo ?? Math.max(0, p.stock + (m.delta ?? 0));
  await tx.product.update({ where: { id: m.productId }, data: { stock: after, ...(m.kind === "RECEIVE" && m.unitCost ? { cost: m.unitCost } : {}) } });
  await tx.stockMove.create({ data: { tenantId: m.tenantId, productId: m.productId, kind: m.kind, delta: after - p.stock, stockAfter: after, unitCost: m.unitCost ?? null, ref: m.ref ?? null, note: m.note ?? "" } });
  return after;
}

export async function receive(tenantId: string, id: string, b: { qty: number; unitCost?: number; note: string }) {
  await own(tenantId, id);
  await prisma.$transaction((tx) => move(tx, { tenantId, productId: id, kind: "RECEIVE", delta: b.qty, unitCost: b.unitCost ?? null, note: b.note }));
  return view(await own(tenantId, id));
}

export async function adjust(tenantId: string, id: string, b: { stock: number; note: string }) {
  await own(tenantId, id);
  await prisma.$transaction((tx) => move(tx, { tenantId, productId: id, kind: "ADJUST", setTo: b.stock, note: b.note }));
  return view(await own(tenantId, id));
}

export async function moves(tenantId: string, id: string) {
  await own(tenantId, id);
  return prisma.stockMove.findMany({ where: { tenantId, productId: id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, kind: true, delta: true, stockAfter: true, unitCost: true, note: true, createdAt: true } });
}

// ───────── reactions to cashier events ─────────

const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function onSaleCreated(tenantId: string, p: Record<string, unknown>) {
  const saleId = String(p.id);
  const sale = await prisma.sale.findFirst({ where: { id: saleId, tenantId }, include: { lines: true } });
  if (!sale || sale.status === "VOID") return;
  const qty = quantities(sale.lines);
  if (!qty.size) return;
  const ids = (await prisma.product.findMany({ where: { tenantId, id: { in: [...qty.keys()] } }, select: { id: true } })).map((x) => x.id);
  for (const productId of ids) {
    try {
      await prisma.$transaction(async (tx) => {
        const [cur] = await tx.$queryRaw<{ stock: number }[]>`SELECT "stock" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
        const d = deduct(cur.stock, qty.get(productId)!);
        await move(tx, { tenantId, productId, kind: "SALE", delta: d.delta, ref: saleId, note: `فاکتور F-${sale.number}${d.shortfall ? ` (کسری موجودی ${d.shortfall})` : ""}` });
      });
    } catch (e) { if (!isDup(e)) throw e; }
  }
}

export async function onSaleVoided(tenantId: string, p: Record<string, unknown>) {
  const saleId = String(p.id);
  const sold = await prisma.stockMove.findMany({ where: { tenantId, ref: saleId, kind: "SALE" } });
  for (const s of sold) {
    try {
      await prisma.$transaction((tx) => move(tx, { tenantId, productId: s.productId, kind: "SALE_VOID", delta: -s.delta, ref: saleId, note: "ابطال فاکتور" }));
    } catch (e) { if (!isDup(e)) throw e; }
  }
}
