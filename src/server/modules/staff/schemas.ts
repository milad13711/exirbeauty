import { z } from "zod";
import { digits } from "@/lib/validate";

const text = (max: number) => z.string().trim().max(max);
const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));
const minute = z.number().int().min(0).max(1440);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ باید YYYY-MM-DD باشد");

const breakSlot = z.object({ s: minute, e: minute, label: text(40).default("") }).refine((b) => b.s < b.e, "شروع استراحت باید قبل از پایان باشد");

const staffFields = z.object({
  name: text(80).min(2),
  title: text(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "رنگ باید مثل #b5476b باشد"),
  phone: z.union([phone, z.literal("")]),
  bio: text(500),
  commissionPct: z.number().int().min(0).max(100),
  startMin: minute,
  endMin: minute,
  daysOff: z.array(z.number().int().min(0).max(6)).max(7),
  breaks: z.array(breakSlot).max(6),
  active: z.boolean(),
  listed: z.boolean(),
});

/** Defaults live only on create; PATCH uses the default-free fields (see customers/schemas.ts). */
export const staffBody = staffFields.partial().required({ name: true }).transform((v) => ({
  title: "", color: "#b5476b", phone: "", bio: "", commissionPct: 30, startMin: 540, endMin: 1140, daysOff: [6], breaks: [] as z.infer<typeof breakSlot>[], active: true, listed: true, ...v,
}));
export type StaffBody = z.output<typeof staffBody>;

/** Cross-field rules, checked on the merged result so partial updates can't create an invalid schedule. */
export function checkSchedule(s: Pick<StaffBody, "startMin" | "endMin" | "breaks">) {
  if (s.startMin >= s.endMin) return "ساعت شروع باید قبل از پایان باشد";
  if (s.breaks.some((b) => b.s < s.startMin || b.e > s.endMin)) return "استراحت‌ها باید داخل ساعت کاری باشند";
  const sorted = [...s.breaks].sort((a, b) => a.s - b.s);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].s < sorted[i - 1].e) return "استراحت‌ها نباید هم‌پوشانی داشته باشند";
  return null;
}

export const staffPatch = staffFields.partial();
export const listQuery = z.object({ all: z.enum(["1", "0"]).optional() });
export const leaveBody = z.object({ fromDate: dateStr, toDate: dateStr, reason: text(200).default("") }).refine((l) => l.fromDate <= l.toDate, "تاریخ پایان باید بعد از شروع باشد");
export const inviteBody = z.object({ phone });
