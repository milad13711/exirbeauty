import { prisma } from "../db";
import { conflict } from "../http/errors";

type Limits = Record<string, number | boolean | undefined>;

/** The numeric/boolean limits of the tenant's current plan (Plan.limits). Empty when there is no active subscription. */
export async function planLimits(tenantId: string): Promise<Limits> {
  const sub = await prisma.subscription.findUnique({ where: { tenantId }, include: { plan: true } });
  return sub && (sub.status === "ACTIVE" || sub.status === "TRIAL") ? ((sub.plan.limits ?? {}) as Limits) : {};
}

/** Throws 409 PLAN_LIMIT when adding one more would exceed the plan's numeric limit for `feature`. */
export async function assertWithinLimit(tenantId: string, feature: string, currentCount: number, adding = 1): Promise<void> {
  const limit = (await planLimits(tenantId))[feature];
  if (typeof limit === "number" && currentCount + adding > limit) {
    throw conflict(`پلن فعلی شما حداکثر ${limit} مورد مجاز می‌داند؛ برای افزودن بیشتر پلن را ارتقا دهید`, "PLAN_LIMIT", { feature, limit });
  }
}
