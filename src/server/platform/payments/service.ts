import { prisma } from "../../db";
import { HttpError, badRequest, conflict, notFound } from "../../http/errors";
import { provisionFromListing } from "../../modules/finder/provision";
import { applyTopup, quoteTopup } from "../../modules/sms/service";
import { assertModuleActive, changePlan, getTenantEntitlements, purchaseAddon } from "../modules/service";
import { zarinpal } from "./zarinpal";

export type PayInput = { kind: "plan"; planCode: string; months: number } | { kind: "addon"; moduleId: string; months: number };

/** The amount is always computed here from DB prices — the client never sends one. */
async function quote(tenantId: string, i: PayInput) {
  if (i.kind === "plan") {
    const plan = await prisma.plan.findUnique({ where: { code: i.planCode } });
    if (!plan || !plan.active) throw notFound("پلن پیدا نشد");
    if (plan.priceMonthly <= 0) throw badRequest("این پلن رایگان است و پرداخت ندارد");
    return { amount: plan.priceMonthly * i.months, description: `اشتراک پلن ${plan.title} — ${i.months} ماه`, planCode: plan.code };
  }
  const e = await getTenantEntitlements(tenantId);
  const m = e.modules.find((x) => x.id === i.moduleId);
  if (!m) throw notFound("ماژول پیدا نشد");
  if (!m.addonPurchasable || m.price <= 0) throw badRequest("این ماژول خرید تکی ندارد");
  if (m.source === "plan") throw conflict("این ماژول از قبل در پلن شما هست", "ALREADY_IN_PLAN");
  return { amount: m.price * i.months, description: `خرید ماژول ${m.name} — ${i.months} ماه`, moduleId: m.id };
}

type Begin = { tenantId: string | null; listingId?: string; userId?: string | null; kind: "PLAN" | "ADDON" | "LISTING_PLAN" | "SMS_TOPUP"; planCode?: string | null; moduleId?: string | null; packageId?: string | null; months: number; amount: number; description: string };

/** Records the payment, asks the gateway for an authority, and returns the URL the customer pays at. */
async function begin(d: Begin) {
  const payment = await prisma.payment.create({
    data: { tenantId: d.tenantId, listingId: d.listingId ?? null, userId: d.userId ?? null, kind: d.kind, planCode: d.planCode ?? null, moduleId: d.moduleId ?? null, packageId: d.packageId ?? null, months: d.months, amount: d.amount, description: d.description },
  });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  try {
    const { authority } = await zarinpal().request({ amount: d.amount, description: d.description, callbackUrl: `${appUrl}/api/v1/payments/zarinpal/callback` });
    await prisma.payment.update({ where: { id: payment.id }, data: { authority } });
    return { paymentId: payment.id, amount: d.amount, paymentUrl: zarinpal().startUrl(authority) };
  } catch (e) {
    console.error("[payments] gateway request failed", e);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failReason: "GATEWAY_REQUEST" } });
    throw new HttpError(502, "GATEWAY_ERROR", "اتصال به درگاه پرداخت برقرار نشد؛ کمی بعد دوباره تلاش کنید");
  }
}

export async function startPayment(tenantId: string, userId: string | null, i: PayInput) {
  const q = await quote(tenantId, i);
  return begin({ tenantId, userId, kind: i.kind === "plan" ? "PLAN" : "ADDON", planCode: "planCode" in q ? q.planCode : null, moduleId: "moduleId" in q ? q.moduleId : null, months: i.months, amount: q.amount, description: q.description });
}

/** Buying SMS credit: the price comes from the package row, never from the client. */
export async function startSmsTopup(tenantId: string, userId: string | null, packageId: string) {
  await assertModuleActive(tenantId, "sms");
  const pkg = await quoteTopup(packageId);
  return begin({ tenantId, userId, kind: "SMS_TOPUP", packageId: pkg.id, months: 1, amount: pkg.price, description: `شارژ پیامک — بسته ${pkg.name}` });
}

/** A published finder listing pays for its plan; success provisions the salon (see modules/finder/provision.ts). */
export const startListingPayment = (listing: { id: string }, plan: { code: string; title: string; priceMonthly: number }, months: number) =>
  begin({ tenantId: null, listingId: listing.id, kind: "LISTING_PLAN", planCode: plan.code, months, amount: plan.priceMonthly * months, description: `فعال‌سازی پنل ${plan.title} — ${months} ماه` });

async function applyEntitlement(p: { id: string; tenantId: string | null; listingId: string | null; kind: "PLAN" | "ADDON" | "LISTING_PLAN" | "SMS_TOPUP"; planCode: string | null; moduleId: string | null; packageId: string | null; months: number }) {
  if (p.kind === "PLAN" && p.planCode && p.tenantId) await changePlan(p.tenantId, p.planCode, p.months);
  else if (p.kind === "ADDON" && p.moduleId && p.tenantId) await purchaseAddon(p.tenantId, p.moduleId, p.months);
  else if (p.kind === "SMS_TOPUP" && p.packageId && p.tenantId) await applyTopup(p.tenantId, p.packageId, p.id);
  else if (p.kind === "LISTING_PLAN" && p.listingId) await provisionFromListing(p.listingId, p.months);
}

/** Gateway redirect target. Idempotent: a refreshed/replayed callback never applies the purchase twice. */
export async function handleCallback(authority: string, status: string): Promise<{ paymentId: string | null; result: "paid" | "failed" | "canceled" }> {
  const p = await prisma.payment.findUnique({ where: { authority } });
  if (!p) return { paymentId: null, result: "failed" };
  if (p.status === "PAID") return { paymentId: p.id, result: "paid" };
  if (p.status !== "PENDING") return { paymentId: p.id, result: p.status === "CANCELED" ? "canceled" : "failed" };

  if (status !== "OK") {
    await prisma.payment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "CANCELED" } });
    return { paymentId: p.id, result: "canceled" };
  }

  let v;
  try {
    v = await zarinpal().verify({ authority, amount: p.amount });
  } catch (e) {
    // Network trouble ≠ failed payment: leave it PENDING so the user can retry the callback / support can reconcile.
    console.error("[payments] verify unreachable", e);
    return { paymentId: p.id, result: "failed" };
  }
  if (v.code !== 100 && v.code !== 101) {
    await prisma.payment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "FAILED", failReason: `VERIFY_${v.code}` } });
    return { paymentId: p.id, result: "failed" };
  }

  const claimed = await prisma.payment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "PAID", refId: v.refId, cardPan: v.cardPan, paidAt: new Date() } });
  if (claimed.count === 1) {
    try {
      await applyEntitlement(p);
    } catch (e) {
      // Money was taken but the purchase couldn't be applied — keep PAID and flag it for manual reconciliation.
      console.error("[payments] APPLY FAILED for paid payment", p.id, e);
      await prisma.payment.update({ where: { id: p.id }, data: { failReason: "APPLY_FAILED" } });
    }
  }
  return { paymentId: p.id, result: "paid" };
}

export async function publicStatus(id: string) {
  const p = await prisma.payment.findUnique({ where: { id }, select: { status: true, kind: true, amount: true, refId: true, description: true, failReason: true } });
  if (!p) throw notFound("پرداخت پیدا نشد");
  return p;
}

export const listForTenant = (tenantId: string) =>
  prisma.payment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, kind: true, planCode: true, moduleId: true, months: true, amount: true, status: true, refId: true, description: true, createdAt: true, paidAt: true } });
