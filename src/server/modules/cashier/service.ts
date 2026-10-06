import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import type { Session } from "../../http/types";
import { assertModuleActive } from "../../platform/modules/service";
import { tehranNow } from "../calendar/availability";
import { transition } from "../calendar/service";
import { addVisit } from "../customers/service";
import { allocateDebt, commissions, netOf, summarize, totals } from "./money";
import type { SaleBody } from "./schemas";

// Every query is scoped by tenantId. Amounts are whole toman; the database also enforces the invoice arithmetic.

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = () => tehranNow().date;

/** A closed day is locked for everything dated that day. */
async function assertOpen(tenantId: string, date: string) {
  if (await prisma.dayClosing.findUnique({ where: { tenantId_date: { tenantId, date: day(date) } } })) {
    throw conflict("این روز بسته شده است؛ ابتدا بازش کنید", "DAY_CLOSED", { date });
  }
}

/** Atomic per-salon invoice number. */
async function nextNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "Sequence" ("tenantId", "key", "value") VALUES (${tenantId}, 'invoice', 1)
    ON CONFLICT ("tenantId", "key") DO UPDATE SET "value" = "Sequence"."value" + 1
    RETURNING "value"`;
  return rows[0].value;
}

const saleInclude = { lines: true, payments: true } as const;
type SaleFull = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;
const view = (s: SaleFull) => ({
  id: s.id, number: s.number, code: `F-${s.number}`, date: ymd(s.date), customerId: s.customerId, customerName: s.customerName, apptId: s.apptId,
  subtotal: s.subtotal, discountPct: s.discountPct, discount: s.discount, total: s.total, paid: s.paid, debt: s.debt, status: s.status, note: s.note, voidReason: s.voidReason, createdAt: s.createdAt,
  lines: s.lines.map((l) => ({ id: l.id, kind: l.kind, refId: l.refId, name: l.name, qty: l.qty, price: l.price, staffId: l.staffId, commissionPct: l.commissionPct })),
  payments: s.payments.map((p) => ({ method: p.method, amount: p.amount, ref: p.ref })),
});

export async function createSale(tenantId: string, actor: Session, b: SaleBody) {
  const date = today();
  await assertOpen(tenantId, date);

  // Appointment → default customer + default lines, and the appointment will be marked done.
  let appt = null;
  if (b.apptId) {
    await assertModuleActive(tenantId, "calendar");
    appt = await prisma.appointment.findFirst({ where: { id: b.apptId, tenantId }, include: { service: true, staff: true } });
    if (!appt) throw badRequest("نوبت پیدا نشد");
    if (appt.status === "PENDING" || appt.status === "CANCELED" || appt.status === "NO_SHOW") throw conflict("برای این نوبت نمی‌توان فاکتور صادر کرد؛ ابتدا تأیید شود", "BAD_APPOINTMENT_STATUS", { status: appt.status });
    if (b.customerId && b.customerId !== appt.customerId) throw badRequest("مشتری با مشتری نوبت یکی نیست");
  }
  const customerId = b.customerId ?? appt?.customerId ?? null;
  const customer = customerId ? await prisma.customer.findFirst({ where: { id: customerId, tenantId, archivedAt: null }, select: { id: true, name: true } }) : null;
  if (customerId && !customer) throw badRequest("مشتری پیدا نشد");

  const lines = b.lines.length ? b.lines : appt ? [{ kind: "SERVICE" as const, refId: appt.serviceId, name: appt.serviceName, qty: 1, price: appt.price, staffId: appt.staffId, commissionPct: appt.service?.commissionPct }] : [];
  if (!lines.length) throw badRequest("فاکتور باید حداقل یک ردیف داشته باشد");

  // Staff and services on the lines must belong to this salon; commission is snapshotted now.
  const staffIds = [...new Set(lines.map((l) => l.staffId).filter((x): x is string => !!x))];
  const staff = staffIds.length ? await prisma.staff.findMany({ where: { tenantId, id: { in: staffIds } }, select: { id: true, commissionPct: true } }) : [];
  if (staff.length !== staffIds.length) throw badRequest("یکی از متخصص‌های فاکتور پیدا نشد");
  const svcIds = [...new Set(lines.filter((l) => l.kind === "SERVICE").map((l) => l.refId).filter((x): x is string => !!x))];
  const services = svcIds.length ? await prisma.service.findMany({ where: { tenantId, id: { in: svcIds } }, select: { id: true, commissionPct: true } }) : [];
  if (services.length !== svcIds.length) throw badRequest("یکی از خدمت‌های فاکتور پیدا نشد");
  const commissionOf = (l: (typeof lines)[number]) => (l.kind !== "SERVICE" ? 0 : l.commissionPct ?? services.find((s) => s.id === l.refId)?.commissionPct ?? staff.find((s) => s.id === l.staffId)?.commissionPct ?? 0);

  const { subtotal, discount, total } = totals(lines, b.discountPct);
  const paid = b.payments.reduce((a, p) => a + p.amount, 0);
  if (paid > total) throw conflict("مبلغ دریافتی از جمع فاکتور بیشتر است", "OVERPAID", { total, paid });
  const debt = total - paid;
  if (debt > 0 && !customer) throw conflict("برای فاکتور بدهکار باید مشتری انتخاب شود", "DEBT_NEEDS_CUSTOMER");
  if (total === 0 && b.discountPct < 100 && lines.every((l) => l.price === 0)) throw badRequest("جمع فاکتور صفر است");

  let sale: SaleFull;
  try {
    sale = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, tenantId);
      return tx.sale.create({
        data: {
          tenantId, number, date: day(date), customerId: customer?.id ?? null, customerName: customer?.name ?? b.customerName, apptId: appt?.id ?? null,
          subtotal, discountPct: b.discountPct, discount, total, paid, debt, status: debt > 0 ? "DEBT" : "PAID", note: b.note, createdById: actor.userId,
          lines: { create: lines.map((l) => ({ kind: l.kind, refId: l.refId ?? null, name: l.name, qty: l.qty, price: l.price, staffId: l.staffId ?? null, commissionPct: commissionOf(l) })) },
          payments: { create: b.payments.map((p) => ({ method: p.method as "CASH" | "CARD" | "ONLINE", amount: p.amount, ref: p.ref })) },
        },
        include: saleInclude,
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("برای این نوبت قبلاً فاکتور صادر شده است", "APPOINTMENT_ALREADY_INVOICED");
    throw e;
  }

  if (appt) {
    // Mark the visit done (this also writes the customer's history). Already-done appointments are left as they are.
    if (appt.status !== "DONE") await transition(tenantId, appt.id, "DONE").catch((e) => console.error("[cashier] could not mark appointment done", appt!.id, e));
  } else if (customer) {
    // Walk-in: service lines become the customer's service history.
    for (const l of lines.filter((x) => x.kind === "SERVICE")) {
      await addVisit(tenantId, customer.id, { at: new Date().toISOString(), service: l.name, category: "", staffName: "", price: netOf(l, b.discountPct), note: `فاکتور F-${sale.number}` })
        .catch((e) => console.error("[cashier] visit history failed", e));
    }
  }
  return view(sale);
}

export async function listSales(tenantId: string, f: { date?: string; from?: string; to?: string; customerId?: string; status?: "PAID" | "DEBT" | "VOID" }) {
  const from = f.date ?? f.from ?? today(), to = f.date ?? f.to ?? from;
  if (to < from) throw badRequest("بازه‌ی تاریخ نامعتبر است");
  if ((day(to).getTime() - day(from).getTime()) / 86_400_000 > 93) throw badRequest("بازه‌ی تاریخ حداکثر ۹۳ روز است");
  const rows = await prisma.sale.findMany({
    where: { tenantId, date: { gte: day(from), lte: day(to) }, ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.status ? { status: f.status } : {}) },
    orderBy: [{ date: "desc" }, { number: "desc" }], include: saleInclude, take: 500,
  });
  return rows.map(view);
}

export async function getSale(tenantId: string, id: string) {
  const s = await prisma.sale.findFirst({ where: { id, tenantId }, include: saleInclude });
  if (!s) throw notFound("فاکتور پیدا نشد");
  return view(s);
}

export async function voidSale(tenantId: string, id: string, reason: string) {
  const s = await prisma.sale.findFirst({ where: { id, tenantId } });
  if (!s) throw notFound("فاکتور پیدا نشد");
  if (s.status === "VOID") throw conflict("این فاکتور قبلاً باطل شده است", "ALREADY_VOID");
  await assertOpen(tenantId, ymd(s.date));
  // Debt payments already applied to this invoice would have to be refunded by hand — don't silently lose that money.
  if (s.paid + s.debt < s.total) throw conflict("برای این فاکتور بدهی دریافت شده؛ ابتدا باید مبلغ برگردانده شود", "HAS_DEBT_PAYMENTS");
  const r = await prisma.sale.updateMany({ where: { id, tenantId, status: { not: "VOID" } }, data: { status: "VOID", voidReason: reason, voidedAt: new Date(), debt: 0 } });
  if (r.count !== 1) throw conflict("این فاکتور همین الان باطل شد", "ALREADY_VOID");
  return getSale(tenantId, id);
}

// ───────── expenses ─────────

export async function addExpense(tenantId: string, e: { title: string; amount: number; method: "CASH" | "CARD"; category: string; date?: string }) {
  const date = e.date ?? today();
  if (date > today()) throw badRequest("تاریخ هزینه نمی‌تواند در آینده باشد");
  await assertOpen(tenantId, date);
  const r = await prisma.expense.create({ data: { tenantId, date: day(date), title: e.title, amount: e.amount, method: e.method, category: e.category } });
  return { id: r.id, date, title: r.title, amount: r.amount, method: r.method, category: r.category };
}

export async function listExpenses(tenantId: string, from: string, to: string) {
  const rows = await prisma.expense.findMany({ where: { tenantId, date: { gte: day(from), lte: day(to) } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 500 });
  return rows.map((r) => ({ id: r.id, date: ymd(r.date), title: r.title, amount: r.amount, method: r.method, category: r.category }));
}

export async function deleteExpense(tenantId: string, id: string) {
  const e = await prisma.expense.findFirst({ where: { id, tenantId } });
  if (!e) throw notFound("هزینه پیدا نشد");
  await assertOpen(tenantId, ymd(e.date));
  await prisma.expense.delete({ where: { id } });
}

// ───────── debts ─────────

export async function listDebts(tenantId: string) {
  const g = await prisma.sale.groupBy({ by: ["customerId"], where: { tenantId, status: "DEBT", debt: { gt: 0 }, customerId: { not: null } }, _sum: { debt: true }, _count: true, _min: { date: true } });
  const customers = await prisma.customer.findMany({ where: { tenantId, id: { in: g.map((x) => x.customerId!) } }, select: { id: true, name: true, phone: true } });
  return g.map((x) => ({ customerId: x.customerId!, name: customers.find((c) => c.id === x.customerId)?.name ?? "", phone: customers.find((c) => c.id === x.customerId)?.phone ?? "", debt: x._sum.debt ?? 0, invoices: x._count, since: x._min.date ? ymd(x._min.date) : null }))
    .sort((a, b) => b.debt - a.debt);
}

/** Collects a debt payment and settles the customer's oldest invoices first, atomically. */
export async function payDebt(tenantId: string, actor: Session, i: { customerId: string; amount: number; method: "CASH" | "CARD" | "ONLINE" }) {
  const date = today();
  await assertOpen(tenantId, date);
  if (!(await prisma.customer.count({ where: { id: i.customerId, tenantId } }))) throw notFound("مشتری پیدا نشد");
  return prisma.$transaction(async (tx) => {
    // Lock the open invoices so two simultaneous payments can't both spend the same debt.
    const owed = await tx.$queryRaw<{ id: string; debt: number; date: Date; number: number }[]>`
      SELECT "id", "debt", "date", "number" FROM "Sale" WHERE "tenantId" = ${tenantId} AND "customerId" = ${i.customerId} AND "status" = 'DEBT' AND "debt" > 0 FOR UPDATE`;
    const total = owed.reduce((a, s) => a + s.debt, 0);
    if (i.amount > total) throw conflict("مبلغ از کل بدهی مشتری بیشتر است", "OVERPAID", { debt: total });
    const { allocations } = allocateDebt(owed.map((s) => ({ id: s.id, debt: s.debt, date: ymd(s.date), number: s.number })), i.amount);
    for (const a of allocations) await tx.sale.update({ where: { id: a.id }, data: { debt: a.remaining, status: a.remaining === 0 ? "PAID" : "DEBT" } });
    const p = await tx.debtPayment.create({ data: { tenantId, customerId: i.customerId, date: day(date), amount: i.amount, method: i.method } });
    return { id: p.id, amount: p.amount, remainingDebt: total - i.amount, settledInvoices: allocations.filter((a) => a.remaining === 0).length, by: actor.userId };
  });
}

// ───────── reports & day closing ─────────

async function periodData(tenantId: string, from: string, to: string) {
  const range = { gte: day(from), lte: day(to) };
  const [sales, expenses, debtPays] = await Promise.all([
    prisma.sale.findMany({ where: { tenantId, date: range, status: { not: "VOID" } }, include: saleInclude }),
    prisma.expense.findMany({ where: { tenantId, date: range } }),
    prisma.debtPayment.findMany({ where: { tenantId, date: range } }),
  ]);
  return { sales, expenses, debtPays };
}

export async function summary(tenantId: string, from: string, to: string) {
  if (to < from) throw badRequest("بازه‌ی تاریخ نامعتبر است");
  if ((day(to).getTime() - day(from).getTime()) / 86_400_000 > 366) throw badRequest("بازه‌ی گزارش حداکثر یک سال است");
  const { sales, expenses, debtPays } = await periodData(tenantId, from, to);
  const rows = sales.map((s) => ({ total: s.total, paid: s.paid, discountPct: s.discountPct, discount: s.discount, lines: s.lines.map((l) => ({ kind: l.kind, qty: l.qty, price: l.price, staffId: l.staffId, commissionPct: l.commissionPct })), payments: s.payments.map((p) => ({ method: p.method, amount: p.amount })) }));
  const names = new Map((await prisma.staff.findMany({ where: { tenantId }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
  return { from, to, ...summarize(rows, expenses, debtPays), byStaff: commissions(rows).map((c) => ({ ...c, name: names.get(c.staffId) ?? "—" })).sort((a, b) => b.revenue - a.revenue) };
}

export async function dayStatus(tenantId: string, date: string) {
  const [closing, s] = await Promise.all([prisma.dayClosing.findUnique({ where: { tenantId_date: { tenantId, date: day(date) } } }), summary(tenantId, date, date)]);
  return { date, closed: !!closing, closing: closing && { expectedCash: closing.expectedCash, countedCash: closing.countedCash, difference: closing.countedCash - closing.expectedCash, note: closing.note, closedAt: closing.closedAt }, expectedCash: s.cashExpected, summary: s };
}

export async function closeDay(tenantId: string, actor: Session, date: string, countedCash: number, note: string) {
  if (date > today()) throw badRequest("نمی‌توان روز آینده را بست");
  if (await prisma.dayClosing.findUnique({ where: { tenantId_date: { tenantId, date: day(date) } } })) throw conflict("این روز قبلاً بسته شده است", "DAY_CLOSED", { date });
  const expectedCash = (await summary(tenantId, date, date)).cashExpected;
  try {
    await prisma.dayClosing.create({ data: { tenantId, date: day(date), expectedCash, countedCash, note, closedById: actor.userId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("این روز قبلاً بسته شده است", "DAY_CLOSED", { date });
    throw e;
  }
  return dayStatus(tenantId, date);
}

export async function reopenDay(tenantId: string, date: string) {
  const r = await prisma.dayClosing.deleteMany({ where: { tenantId, date: day(date) } });
  if (!r.count) throw notFound("این روز بسته نشده است");
  return dayStatus(tenantId, date);
}

