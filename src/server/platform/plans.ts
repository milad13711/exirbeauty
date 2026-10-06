export type PlanSeed = { code: string; title: string; tagline: string; priceMonthly: number; sortOrder: number; limits: Record<string, number | boolean> };

/** Plan catalog. Module distribution lives in each module manifest (`defaultPlans`) and then in the DB matrix. */
export const DEFAULT_PLANS: PlanSeed[] = [
  { code: "free", title: "رایگان", tagline: "فقط دیده شو", priceMonthly: 0, sortOrder: 0, limits: { staff: 1, dashboard: false, leads: false, directBooking: false } },
  { code: "artist", title: "هنرمند", tagline: "برای فعالیت تک‌نفره", priceMonthly: 490_000, sortOrder: 1, limits: { staff: 1, dashboard: true, leads: true, directBooking: false } },
  { code: "salon", title: "سالن", tagline: "برای سالن با چند متخصص", priceMonthly: 1_490_000, sortOrder: 2, limits: { staff: 10, dashboard: true, leads: true, directBooking: true } },
];
