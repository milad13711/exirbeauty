import { z } from "zod";
import { MAX_TEXT } from "../sms/text";
import { dateStr } from "../cashier/schemas";

const text = (max: number) => z.string().trim().max(max);

export const segment = z.object({
  inactiveDays: z.number().int().min(1).max(1000).optional(),
  tiers: z.array(text(30)).max(8).optional(),
  birthdayMonth: z.boolean().optional(),
  minSpend: z.number().int().min(0).max(1_000_000_000).optional(),
  service: text(80).optional(),
});
const message = z.string().trim().min(10, "متن پیام را کامل بنویسید").max(MAX_TEXT);

export const previewBody = z.object({ segment, message });
export const createBody = z.object({
  name: text(80).min(3, "نام کمپین را وارد کنید"), message, segment,
  // omitted = send now; otherwise a salon-local date and minute of day
  sendAt: z.object({ date: dateStr, minute: z.number().int().min(0).max(1439) }).optional(),
});
