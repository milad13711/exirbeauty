import type { Prisma } from "@prisma/client";
import { conflict } from "../../http/errors";

// The only code that moves a card's balance. The cashier calls these inside its own transaction,
// so an invoice and its gift-card spend succeed or fail together.

type Tx = Prisma.TransactionClient;

/** Takes `amount` off an active card, atomically. Throws 409 when the card can't cover it. */
export async function spendGift(tx: Tx, tenantId: string, cardId: string, amount: number, saleId: string) {
  const rows = await tx.$queryRaw<{ balance: number }[]>`
    UPDATE "GiftCard" SET "balance" = "balance" - ${amount}, "status" = CASE WHEN "balance" - ${amount} = 0 THEN 'USED'::"GiftStatus" ELSE "status" END
    WHERE "id" = ${cardId} AND "tenantId" = ${tenantId} AND "status" = 'ACTIVE' AND "balance" >= ${amount}
    RETURNING "balance"`;
  if (!rows.length) throw conflict("موجودی کارت هدیه کافی نیست یا کارت دیگر فعال نیست", "GIFT_CARD_INSUFFICIENT");
  await tx.giftCardTx.create({ data: { tenantId, cardId, kind: "SPEND", delta: -amount, balanceAfter: rows[0].balance, ref: saleId } });
}

/** Puts value back when an invoice paid with the card is voided. */
export async function refundGift(tx: Tx, tenantId: string, cardId: string, amount: number, saleId: string) {
  const rows = await tx.$queryRaw<{ balance: number }[]>`
    UPDATE "GiftCard" SET "balance" = LEAST("amount", "balance" + ${amount}), "status" = 'ACTIVE'::"GiftStatus"
    WHERE "id" = ${cardId} AND "tenantId" = ${tenantId} AND "status" <> 'VOID'
    RETURNING "balance"`;
  if (!rows.length) return; // the card itself was voided: nothing to give back
  await tx.giftCardTx.create({ data: { tenantId, cardId, kind: "REFUND", delta: amount, balanceAfter: rows[0].balance, ref: saleId } });
}

/** Voiding the invoice that SOLD a card voids the card — but only while it is untouched. */
export async function voidIssuedBy(tx: Tx, tenantId: string, saleId: string) {
  const card = await tx.giftCard.findFirst({ where: { tenantId, saleId } });
  if (!card) return;
  if (card.balance !== card.amount) throw conflict("کارت هدیه‌ی این فاکتور قبلاً (بخشی) خرج شده؛ ابطال فاکتور ممکن نیست", "GIFT_CARD_SPENT");
  await tx.giftCard.update({ where: { id: card.id }, data: { status: "VOID", balance: 0 } });
  await tx.giftCardTx.create({ data: { tenantId, cardId: card.id, kind: "VOID", delta: -card.amount, balanceAfter: 0, ref: null } });
}
