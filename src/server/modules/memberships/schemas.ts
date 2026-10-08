import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const id = z.string().min(1).max(40);

const fields = {
  name: text(80).min(3, "نام پلن را وارد کنید"),
  price: z.number().int().min(1, "قیمت باید بیشتر از صفر باشد").max(1_000_000_000),
  months: z.number().int().min(1).max(24),
  credits: z.number().int().min(0).max(1000),
  creditLabel: text(60),
  discountPct: z.number().int().min(0).max(60),
  perks: z.array(text(120)).max(12),
  active: z.boolean(),
};
export const planBody = z.object({ ...fields, creditLabel: fields.creditLabel.default(""), discountPct: fields.discountPct.default(0), perks: fields.perks.default([]), active: fields.active.default(true) });
export const planPatch = z.object(fields).partial();

export const sellBody = z.object({
  customerId: id, planId: id,
  payments: z.array(z.object({ method: z.enum(["CASH", "CARD", "ONLINE", "WALLET"]), amount: z.number().int().min(1).max(1_000_000_000) })).max(4).default([]),
});
export const useBody = z.object({ note: text(200).default("") });
export const listQuery = z.object({ status: z.enum(["ACTIVE", "EXPIRED", "CANCELED"]).optional(), customerId: id.optional() });
