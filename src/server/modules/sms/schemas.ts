import { z } from "zod";
import { MAX_TEXT } from "./text";

const text = z.string().trim().min(1).max(MAX_TEXT);
const id = z.string().min(1).max(40);

export const sendBody = z.object({ customerId: id.nullish(), phone: z.string().trim().max(20).optional(), text });
export const topupBody = z.object({ packageId: id });
export const scenarioBody = z.object({ enabled: z.boolean().optional(), template: text.optional() }).refine((b) => b.enabled !== undefined || b.template !== undefined, "چیزی برای تغییر ارسال نشده");
export const thresholdBody = z.object({ lowThreshold: z.number().int().min(0).max(100_000_000) });
export const listQuery = z.object({ status: z.enum(["SENT", "FAILED", "BLOCKED", "QUEUED"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) });
export const statsQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });

export const pricingBody = z.object({ sell: z.number().int().min(1).max(100_000) });
export const packageBody = z.object({ name: z.string().trim().min(1).max(60), price: z.number().int().min(10_000).max(1_000_000_000), bonusPct: z.number().int().min(0).max(100).default(0), sortOrder: z.number().int().min(0).max(1000).default(0) });
export const packagePatch = z.object({ name: z.string().trim().min(1).max(60), price: z.number().int().min(10_000).max(1_000_000_000), bonusPct: z.number().int().min(0).max(100), sortOrder: z.number().int().min(0).max(1000), active: z.boolean() }).partial();
export const adjustBody = z.object({ tenantId: id, delta: z.number().int().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0, "مقدار صفر مجاز نیست"), note: z.string().trim().min(1).max(200) });
