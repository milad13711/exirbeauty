import { z } from "zod";
import { isRealDate } from "../calendar/availability";

const text = (max: number) => z.string().trim().max(max);
const id = z.string().min(1).max(40);
const money = z.number().int().min(0).max(1_000_000_000);
export const dateStr = z.string().refine(isRealDate, "تاریخ باید یک روز معتبر به شکل YYYY-MM-DD باشد");

// Wallet and gift-card payments belong to the loyalty / gift-card modules, which aren't on the backend yet.
const method = z.enum(["CASH", "CARD", "ONLINE", "WALLET", "GIFT"]).refine((m) => m === "CASH" || m === "CARD" || m === "ONLINE", "پرداخت با کیف پول و کارت هدیه هنوز فعال نیست");

export const line = z.object({
  kind: z.enum(["SERVICE", "PRODUCT", "OTHER"]),
  refId: id.nullish(),
  name: text(120).min(1),
  qty: z.number().int().min(1).max(999),
  price: money,
  staffId: id.nullish(),
  commissionPct: z.number().int().min(0).max(100).optional(),
});

export const saleBody = z.object({
  customerId: id.nullish(),
  customerName: text(80).default(""),
  apptId: id.nullish(),
  lines: z.array(line).max(50).default([]),
  discountPct: z.number().int().min(0).max(100).default(0),
  payments: z.array(z.object({ method, amount: z.number().int().min(1).max(1_000_000_000), ref: text(60).default("") })).max(6).default([]),
  note: text(300).default(""),
});
export type SaleBody = z.infer<typeof saleBody>;

export const voidBody = z.object({ reason: text(200).min(3, "دلیل ابطال را بنویسید") });
export const salesQuery = z.object({ date: dateStr.optional(), from: dateStr.optional(), to: dateStr.optional(), customerId: id.optional(), status: z.enum(["PAID", "DEBT", "VOID"]).optional() });
export const rangeQuery = z.object({ from: dateStr, to: dateStr.optional() });

export const expenseBody = z.object({ title: text(100).min(2), amount: z.number().int().min(1).max(1_000_000_000), method: z.enum(["CASH", "CARD"]), category: text(40).default(""), date: dateStr.optional() });
export const debtPayBody = z.object({ customerId: id, amount: z.number().int().min(1).max(1_000_000_000), method });
export const closeBody = z.object({ countedCash: money, note: text(300).default("") });
