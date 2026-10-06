import { z } from "zod";
import { digits } from "@/lib/validate";

const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));
const text = (max: number) => z.string().trim().max(max);
const list = (max = 20, item = 80) => z.array(text(item).min(1)).max(max);

const hair = z.object({ current: text(80), type: text(80), state: text(120), brand: text(80), oxidant: text(40), lastColor: text(40), formula: text(300), history: list(30, 120) }).partial();
const skin = z.object({ type: text(60), used: text(200), allergies: text(200), facials: list(30, 120) }).partial();
const nail = z.object({ services: text(120), colors: text(120), allergies: text(120) }).partial();
export const beautyProfile = z.object({ hair, skin, nail }).partial();

// The field definitions carry no defaults, so a PATCH built from them can never reset what the client didn't send.
const customerFields = z.object({
  name: text(80).min(2),
  phone,
  gender: z.enum(["FEMALE", "MALE", "OTHER"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ باید YYYY-MM-DD باشد").nullable(),
  note: text(1000),
  tags: list(),
  allergies: list(),
  occasions: list(),
  beauty: beautyProfile,
  source: text(60),
  referredById: z.string().min(1).nullable(),
});

/** Create: only name + phone are required; everything else falls back to a default. */
export const customerBody = customerFields.partial().required({ name: true, phone: true }).transform((v) => ({
  gender: "FEMALE" as const, note: "", tags: [] as string[], allergies: [] as string[], occasions: [] as string[], beauty: {} as z.infer<typeof beautyProfile>, source: "", ...v,
}));
export type CustomerBody = z.infer<typeof customerBody>;

export const customerPatch = customerFields.partial();

export const listQuery = z.object({
  q: z.string().trim().max(60).optional(),
  tag: z.string().trim().max(80).optional(),
  cursor: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const visitBody = z.object({
  at: z.string().datetime({ offset: true }),
  service: text(120).min(1),
  category: text(40).default(""),
  staffName: text(80).default(""),
  price: z.number().int().min(0).max(1_000_000_000).default(0),
  note: text(500).default(""),
});

export const importBody = z.object({ rows: z.array(customerFields.pick({ name: true, phone: true, gender: true, note: true, tags: true, allergies: true, birthDate: true }).partial().required({ name: true, phone: true })).min(1).max(500) });
