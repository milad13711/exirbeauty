import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

const serviceFields = z.object({
  category: text(40).min(1),
  name: text(80).min(2),
  price: z.number().int().min(0).max(1_000_000_000),
  durationMin: z.number().int().min(5).max(720),
  materials: text(300),
  materialCost: z.number().int().min(0).max(1_000_000_000),
  commissionPct: z.number().int().min(0).max(100),
  capacity: z.number().int().min(1).max(20),
  discountNote: text(200),
  packageNote: text(200),
  active: z.boolean(),
  staffIds: z.array(z.string().min(1)).max(50),
});

/** Defaults live only on create; PATCH uses the default-free fields so it can't reset anything. */
export const serviceBody = serviceFields.partial().required({ category: true, name: true, price: true, durationMin: true }).transform((v) => ({
  materials: "", materialCost: 0, commissionPct: 30, capacity: 1, discountNote: "", packageNote: "", active: true, ...v,
}));
export type ServiceBody = z.output<typeof serviceBody>;
export const servicePatch = serviceFields.partial();

export const listQuery = z.object({ category: text(40).optional(), active: z.enum(["1", "0"]).optional() });
export const assignBody = z.object({ staffIds: z.array(z.string().min(1)).max(50) });
