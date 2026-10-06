import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const id = z.string().min(1).max(40);

const tier = z.object({ name: text(30).min(1), from: z.number().int().min(0).max(10_000_000), off: z.number().int().min(0).max(100), perks: text(120).default("") });
const rate = z.object({ pts: z.number().int().min(0).max(100_000), per: z.number().int().min(1000).max(1_000_000_000) });
const reward = z.object({ id: id, name: text(80).min(1), cost: z.number().int().min(1).max(10_000_000), kind: z.enum(["wallet", "free", "product"]), value: z.number().int().min(0).max(1_000_000_000) })
  .refine((r) => r.kind !== "wallet" || r.value > 0, "مقدار اعتبار جایزه را وارد کنید");

export const configBody = z.object({
  tiers: z.array(tier).min(1).max(8),
  earn: z.object({ visit: z.number().int().min(0).max(100_000), svc: rate, prod: rate }),
  rewards: z.array(reward).max(30),
  cashback: z.object({ on: z.boolean(), pct: z.number().min(0).max(50), minSpend: z.number().int().min(0).max(1_000_000_000), maxPerSale: z.number().int().min(0).max(1_000_000_000) }),
}).superRefine((c, ctx) => {
  const names = c.tiers.map((t) => t.name);
  if (new Set(names).size !== names.length) ctx.addIssue({ code: "custom", path: ["tiers"], message: "نام سطح‌ها تکراری است" });
  const froms = c.tiers.map((t) => t.from);
  if (new Set(froms).size !== froms.length) ctx.addIssue({ code: "custom", path: ["tiers"], message: "آستانه‌ی سطح‌ها تکراری است" });
  if (!froms.includes(0)) ctx.addIssue({ code: "custom", path: ["tiers"], message: "سطح پایه باید از ۰ امتیاز شروع شود" });
  const ids = c.rewards.map((r) => r.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["rewards"], message: "شناسه‌ی جایزه‌ها تکراری است" });
});

export const redeemBody = z.object({ rewardId: id });
export const adjustBody = z.object({ points: z.number().int().min(-10_000_000).max(10_000_000).default(0), wallet: z.number().int().min(-1_000_000_000).max(1_000_000_000).default(0), note: text(200).min(2, "دلیل را بنویسید") })
  .refine((b) => b.points !== 0 || b.wallet !== 0, "مقدار صفر مجاز نیست");
export const membersQuery = z.object({ sort: z.enum(["points", "wallet", "lifetime"]).default("points"), limit: z.coerce.number().int().min(1).max(200).default(50) });
