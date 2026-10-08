import { z } from "zod";
import { digits } from "@/lib/validate";
import { isRealDate } from "./availability";

const text = (max: number) => z.string().trim().max(max);
const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));
export const date = z.string().refine(isRealDate, "تاریخ باید یک روز معتبر به شکل YYYY-MM-DD باشد");
const minute = z.number().int().min(0).max(1439);
const id = z.string().min(1).max(40);

export const dayHours = z.object({ open: z.boolean(), start: z.number().int().min(0).max(1440), end: z.number().int().min(0).max(1440) })
  .refine((d) => !d.open || d.start < d.end, "ساعت شروع باید قبل از پایان باشد");

export const settingsBody = z.object({
  hours: z.array(dayHours).length(7),
  onlineEnabled: z.boolean(),
  autoConfirm: z.boolean(),
  leadHours: z.number().int().min(0).max(168),
  cancelHours: z.number().int().min(0).max(168),
  stepMin: z.union([z.literal(10), z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
}).partial();

export const availabilityQuery = z.object({ serviceId: id, date, staffId: id.optional() });

export const createBody = z.object({ customerId: id, staffId: id, serviceId: id, date, startMin: minute, note: text(500).default(""), status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED") });
export const listQuery = z.object({
  date: date.optional(), from: date.optional(), to: date.optional(), staffId: id.optional(), customerId: id.optional(),
  status: z.enum(["PENDING", "CONFIRMED", "IN_SERVICE", "DONE", "CANCELED", "NO_SHOW"]).optional(),
});
export const statusBody = z.object({ status: z.enum(["CONFIRMED", "IN_SERVICE", "DONE", "NO_SHOW"]) });
export const cancelBody = z.object({ reason: text(200).default("") });
export const moveBody = z.object({ date, startMin: minute, staffId: id.optional() });
export const notePatch = z.object({ note: text(500) });

export const waitBody = z.object({ name: text(80).min(2), phone, serviceId: id, staffId: id.nullable().optional(), fromDate: date, toDate: date, note: text(200).default("") })
  .refine((w) => w.fromDate <= w.toDate, "تاریخ پایان باید بعد از شروع باشد");
export const waitBook = z.object({ staffId: id, date, startMin: minute });

export const publicBook = z.object({ serviceId: id, staffId: id.optional(), date, startMin: minute, name: text(80).min(2), phone, note: text(300).default(""), ref: text(20).optional() });
