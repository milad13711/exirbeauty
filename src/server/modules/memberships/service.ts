import { type Membership } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import type { Session } from "../../http/types";
import { tehranNow } from "../calendar/availability";
import { createSale, voidSale } from "../cashier/service";
import { effectiveStatus, mrr, termFor } from "./rules";

// Every query is scoped by tenantId. Selling a membership is a real invoice in the cashier, so it lands in the day's revenue.

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = () => tehranNow().date;

// ───────── plans ─────────

const planView = (p: { id: string; name: string; price: number; months: number; credits: number; creditLabel: string; discountPct: number; perks: string[]; active: boolean }) =>
  ({ id: p.id, name: p.name, price: p.price, months: p.months, credits: p.credits, creditLabel: p.creditLabel, discountPct: p.discountPct, perks: p.perks, active: p.active });

export async function listPlans(tenantId: string, activeOnly: boolean) {
  return (await prisma.membershipPlan.findMany({ where: { tenantId, archivedAt: null, ...(activeOnly ? { active: true } : {}) }, orderBy: { price: "asc" } })).map(planView);
}
export async function createPlan(tenantId: string, b: Omit<ReturnType<typeof planView>, "id">) {
  return planView(await prisma.membershipPlan.create({ data: { tenantId, ...b } }));
}
async function ownPlan(tenantId: string, id: string) {
  const p = await prisma.membershipPlan.findFirst({ where: { id, tenantId, archivedAt: null } });
  if (!p) throw notFound("پلن پیدا نشد");
  return p;
}
export async function updatePlan(tenantId: string, id: string, b: Partial<Omit<ReturnType<typeof planView>, "id">>) {
  await ownPlan(tenantId, id);
  return planView(await prisma.membershipPlan.update({ where: { id }, data: b }));
}
/** Archived, not deleted: memberships already sold keep their snapshot. */
export async function archivePlan(tenantId: string, id: string) {
  await ownPlan(tenantId, id);
  await prisma.membershipPlan.update({ where: { id }, data: { archivedAt: new Date(), active: false } });
}

// ───────── selling & using ─────────

const view = (m: Membership & { customer?: { name: string } }, t = today()) => ({
  id: m.id, customerId: m.customerId, customerName: m.customer?.name, planName: m.planName, discountPct: m.discountPct,
  startDate: ymd(m.startDate), expiryDate: ymd(m.expiryDate), credits: m.credits, creditsTotal: m.creditsTotal, creditLabel: m.creditLabel,
  status: effectiveStatus({ status: m.status, expiryDate: ymd(m.expiryDate) }, t), saleId: m.saleId,
});

/**
 * Sells (or renews) a membership through the cashier. If the customer already holds a valid membership of the same plan,
 * the term extends and sessions are added instead of creating a second one.
 */
export async function sell(tenantId: string, actor: Session, b: { customerId: string; planId: string; payments: { method: "CASH" | "CARD" | "ONLINE" | "WALLET"; amount: number }[] }) {
  const plan = await ownPlan(tenantId, b.planId);
  if (!plan.active) throw conflict("این پلن فعلاً فروخته نمی‌شود", "PLAN_INACTIVE");
  const customer = await prisma.customer.findFirst({ where: { id: b.customerId, tenantId, archivedAt: null }, select: { id: true, name: true } });
  if (!customer) throw badRequest("مشتری پیدا نشد");

  const sale = await createSale(tenantId, actor, {
    customerId: customer.id, customerName: "", apptId: null, discountPct: 0, note: `عضویت ${plan.name}`,
    lines: [{ kind: "OTHER", name: `عضویت ${plan.name}`, qty: 1, price: plan.price }], payments: b.payments.map((p) => ({ ...p, ref: "" })),
  });
  try {
    const t = today();
    const current = await prisma.membership.findFirst({ where: { tenantId, customerId: customer.id, planId: plan.id, status: "ACTIVE", expiryDate: { gte: day(t) } }, orderBy: { expiryDate: "desc" } });
    const term = termFor(t, plan.months, current ? ymd(current.expiryDate) : null);
    if (current) {
      const m = await prisma.membership.update({ where: { id: current.id }, data: { expiryDate: day(term.expiry), credits: { increment: plan.credits }, creditsTotal: { increment: plan.credits } }, include: { customer: { select: { name: true } } } });
      return { membership: view(m), saleNumber: sale.number, renewed: true };
    }
    const m = await prisma.membership.create({
      data: { tenantId, customerId: customer.id, planId: plan.id, planName: plan.name, discountPct: plan.discountPct, startDate: day(term.start), expiryDate: day(term.expiry), credits: plan.credits, creditsTotal: plan.credits, creditLabel: plan.creditLabel, saleId: sale.id },
      include: { customer: { select: { name: true } } },
    });
    return { membership: view(m), saleNumber: sale.number, renewed: false };
  } catch (e) {
    // Money was taken but the membership couldn't be recorded: undo the invoice rather than leave the customer paid-and-empty.
    await voidSale(tenantId, sale.id, "خطا در ثبت عضویت").catch((x) => console.error("[memberships] could not void invoice after failure", sale.id, x));
    throw e;
  }
}

/** Uses one included session. The conditional UPDATE is the whole check, so two tills can't spend the last session twice. */
export async function useSession(tenantId: string, id: string, note: string) {
  const t = today();
  const claimed = await prisma.$queryRaw<{ credits: number }[]>`
    UPDATE "Membership" SET "credits" = "credits" - 1
    WHERE "id" = ${id} AND "tenantId" = ${tenantId} AND "status" = 'ACTIVE' AND "credits" > 0 AND "expiryDate" >= ${day(t)}
    RETURNING "credits"`;
  if (!claimed.length) {
    const m = await prisma.membership.findFirst({ where: { id, tenantId } });
    if (!m) throw notFound("عضویت پیدا نشد");
    const s = effectiveStatus({ status: m.status, expiryDate: ymd(m.expiryDate) }, t);
    throw conflict(s === "EXPIRED" ? "مدت عضویت تمام شده است" : s === "CANCELED" ? "این عضویت لغو شده است" : "جلسه‌ی باقی‌مانده‌ای نیست", "NO_SESSIONS");
  }
  await prisma.membershipUse.create({ data: { tenantId, membershipId: id, note } });
  return view(await prisma.membership.findFirstOrThrow({ where: { id, tenantId }, include: { customer: { select: { name: true } } } }));
}

export async function cancel(tenantId: string, id: string) {
  const r = await prisma.membership.updateMany({ where: { id, tenantId, status: "ACTIVE" }, data: { status: "CANCELED" } });
  if (r.count !== 1) {
    if (!(await prisma.membership.count({ where: { id, tenantId } }))) throw notFound("عضویت پیدا نشد");
    throw conflict("این عضویت قبلاً لغو شده است", "ALREADY_CANCELED");
  }
}

/** A voided invoice cancels the membership it sold (reaction to the cashier's event). */
export async function onSaleVoided(tenantId: string, p: Record<string, unknown>) {
  await prisma.membership.updateMany({ where: { tenantId, saleId: String(p.id), status: "ACTIVE" }, data: { status: "CANCELED" } });
}

// ───────── reading ─────────

export async function list(tenantId: string, f: { status?: "ACTIVE" | "EXPIRED" | "CANCELED"; customerId?: string }) {
  const t = today();
  const rows = await prisma.membership.findMany({ where: { tenantId, ...(f.customerId ? { customerId: f.customerId } : {}) }, include: { customer: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 300 });
  return rows.map((m) => view(m, t)).filter((m) => !f.status || m.status === f.status);
}

/** What the till needs for one customer: their valid membership (if any) and the discount it carries. */
export async function customerState(tenantId: string, customerId: string) {
  if (!(await prisma.customer.count({ where: { id: customerId, tenantId } }))) throw notFound("مشتری پیدا نشد");
  const active = (await list(tenantId, { customerId, status: "ACTIVE" }))[0] ?? null;
  return { membership: active, discountPct: active?.discountPct ?? 0 };
}

export async function overview(tenantId: string) {
  const t = today();
  const valid = await prisma.membership.findMany({ where: { tenantId, status: "ACTIVE", expiryDate: { gte: day(t) } }, select: { credits: true, planId: true } });
  const plans = await prisma.membershipPlan.findMany({ where: { tenantId, id: { in: [...new Set(valid.map((v) => v.planId).filter((x): x is string => !!x))] } }, select: { id: true, price: true, months: true } });
  const byId = new Map(plans.map((p) => [p.id, p]));
  return {
    activeMembers: valid.length,
    mrr: mrr(valid.map((v) => byId.get(v.planId ?? "")).filter((p): p is { id: string; price: number; months: number } => !!p)),
    sessionsLeft: valid.reduce((a, v) => a + v.credits, 0),
    plans: await prisma.membershipPlan.count({ where: { tenantId, archivedAt: null, active: true } }),
  };
}

