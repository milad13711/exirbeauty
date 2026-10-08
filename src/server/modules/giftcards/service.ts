import { prisma } from "../../db";
import { badRequest, notFound } from "../../http/errors";
import { rateLimit } from "../../http/ratelimit";
import type { Session } from "../../http/types";
import { assertModuleActive } from "../../platform/modules/service";
import { createSale, voidSale } from "../cashier/service";
import { sendSms } from "../sms/service";
import { normalizePhone } from "../sms/text";
import { hashCode, last4, newCode } from "./rules";

// Every query is scoped by tenantId. The full code exists only in the response to issuing (and the recipient's SMS).

const card = (g: { id: string; last4: string; amount: number; balance: number; status: string; fromName: string; toName: string; toPhone: string; occasion: string; message: string; saleId: string | null; createdAt: Date }) => ({
  id: g.id, last4: g.last4, amount: g.amount, balance: g.balance, status: g.status, fromName: g.fromName, toName: g.toName, toPhone: g.toPhone, occasion: g.occasion, message: g.message, saleId: g.saleId, createdAt: g.createdAt,
});

/** Sells a gift card through the cashier (a liability, not revenue — see cashier/money.ts), then creates the card. */
export async function issue(tenantId: string, actor: Session, b: { buyerId?: string | null; fromName: string; toName: string; toPhone: string; occasion: string; message: string; amount: number; payments: { method: "CASH" | "CARD" | "ONLINE" | "WALLET"; amount: number }[] }) {
  const phone = normalizePhone(b.toPhone);
  if (!phone) throw badRequest("موبایل گیرنده معتبر نیست");
  let fromName = b.fromName.trim();
  if (b.buyerId) {
    const c = await prisma.customer.findFirst({ where: { id: b.buyerId, tenantId, archivedAt: null }, select: { name: true } });
    if (!c) throw badRequest("مشتری پیدا نشد");
    fromName = fromName || c.name;
  }
  if (fromName.length < 2) throw badRequest("نام خریدار را وارد یا انتخاب کنید");

  const sale = await createSale(tenantId, actor, {
    customerId: b.buyerId ?? null, customerName: b.buyerId ? "" : fromName, apptId: null, discountPct: 0, note: `کارت هدیه برای ${b.toName}`,
    lines: [{ kind: "GIFT", name: `کارت هدیه ${b.amount.toLocaleString("en-US")} تومانی`, qty: 1, price: b.amount }], payments: b.payments.map((p) => ({ ...p, ref: "" })),
  });
  const code = newCode();
  try {
    const g = await prisma.$transaction(async (tx) => {
      const created = await tx.giftCard.create({ data: { tenantId, codeHash: hashCode(code), last4: last4(code), amount: b.amount, balance: b.amount, buyerId: b.buyerId ?? null, fromName, toName: b.toName, toPhone: phone, occasion: b.occasion, message: b.message, saleId: sale.id } });
      await tx.giftCardTx.create({ data: { tenantId, cardId: created.id, kind: "ISSUE", delta: b.amount, balanceAfter: b.amount, ref: null } });
      return created;
    });
    return { ...card(g), code, saleNumber: sale.number, smsSent: await textRecipient(tenantId, g.id, phone, fromName, b.toName, b.amount, code) };
  } catch (e) {
    await voidSale(tenantId, sale.id, "خطا در صدور کارت هدیه").catch((x) => console.error("[giftcards] could not void invoice after failure", sale.id, x));
    throw e;
  }
}

/** Best effort: the card is valid either way, the salon can hand the code over itself if this didn't go out. */
async function textRecipient(tenantId: string, cardId: string, phone: string, from: string, to: string, amount: number, code: string) {
  try {
    await assertModuleActive(tenantId, "sms");
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const r = await sendSms(tenantId, { phone, text: `${to} عزیز، ${from} یک کارت هدیه ${amount.toLocaleString("en-US")} تومانی از ${tenant?.name ?? "سالن"} برایتان فرستاده است. کد: ${code}`, kind: "MANUAL", relatedId: `gift:${cardId}` });
    return r.status === "SENT";
  } catch { return false; }
}

/** What the till shows after typing a code. Throttled: this is the only place a code can be probed. */
export async function lookup(tenantId: string, code: string) {
  rateLimit(`gift:${tenantId}`, 60, 10 * 60_000);
  const g = await prisma.giftCard.findFirst({ where: { tenantId, codeHash: hashCode(code) } });
  if (!g) throw notFound("کد کارت هدیه معتبر نیست");
  return { id: g.id, last4: g.last4, balance: g.balance, amount: g.amount, status: g.status, toName: g.toName };
}

export async function list(tenantId: string, status?: "ACTIVE" | "USED" | "VOID") {
  return (await prisma.giftCard.findMany({ where: { tenantId, ...(status ? { status } : {}) }, orderBy: { createdAt: "desc" }, take: 300 })).map(card);
}

export async function history(tenantId: string, id: string) {
  const g = await prisma.giftCard.findFirst({ where: { id, tenantId } });
  if (!g) throw notFound("کارت پیدا نشد");
  return prisma.giftCardTx.findMany({ where: { tenantId, cardId: id }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true, delta: true, balanceAfter: true, createdAt: true } });
}

export async function overview(tenantId: string) {
  const [all, active] = await Promise.all([
    prisma.giftCard.aggregate({ where: { tenantId, status: { not: "VOID" } }, _count: true, _sum: { amount: true } }),
    prisma.giftCard.aggregate({ where: { tenantId, status: "ACTIVE" }, _sum: { balance: true } }),
  ]);
  return { issued: all._count, sold: all._sum.amount ?? 0, outstanding: active._sum.balance ?? 0 };
}

