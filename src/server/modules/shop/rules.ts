// Pure store rules (no DB).
export const RETURN_DAYS = 7;
const DAY = 86_400_000;

export const lineTotal = (l: { price: number; qty: number }) => l.price * l.qty;
export const orderTotal = (lines: { price: number; qty: number }[]) => lines.reduce((a, l) => a + lineTotal(l), 0);
/** Commission is each line's share by its product's rate, rounded per line, snapshotted at order time. */
export const commissionOf = (lines: { price: number; qty: number; commissionPct: number }[]) => lines.reduce((a, l) => a + Math.round((lineTotal(l) * l.commissionPct) / 100), 0);

export type Status = "PENDING_PAYMENT" | "PAID" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELED";
const NEXT: Record<Status, Status[]> = { PENDING_PAYMENT: ["CANCELED"], PAID: ["SHIPPED", "CANCELED"], SHIPPED: ["DELIVERED", "CANCELED"], DELIVERED: ["RETURNED"], RETURNED: [], CANCELED: [] };
export const canMove = (from: Status, to: Status) => NEXT[from].includes(to);

/** Money earned on an order is released only after the return window has passed since delivery. */
export const releasableAt = (deliveredAt: Date, days = RETURN_DAYS) => new Date(deliveredAt.getTime() + days * DAY);
export const isReleasable = (o: { status: Status; commissionStatus: string; deliveredAt: Date | null }, now: Date, days = RETURN_DAYS) =>
  o.status === "DELIVERED" && o.commissionStatus === "WAITING" && !!o.deliveredAt && releasableAt(o.deliveredAt, days) <= now;

/** A salon doesn't earn commission on its own people's purchases. */
export const earnsCommission = (orderPhone: string, tenantPhones: string[]) => !tenantPhones.includes(orderPhone);

/** Which store categories suit a customer's last service category. */
const REC: Record<string, string[]> = { "مو": ["مو", "ست هدیه"], "پوست": ["پوست", "ست هدیه"], "ناخن": ["ناخن"], "آرایش": ["ست هدیه", "پوست"] };
export const recommendCategories = (serviceCategory: string | null) => (serviceCategory && REC[serviceCategory]) || ["مو", "پوست"];

export const PENDING_TTL_MS = 30 * 60_000;

export const FREE_SHIPPING_OVER = 2_000_000;
export const FLAT_SHIPPING = 60_000;
/** Flat shipping, free above a threshold. Commission is earned on the goods only, never on shipping. */
export const shippingFor = (goods: number) => (goods <= 0 || goods > FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING);

export type Boost = { extraPct: number; category: string | null; startsOn: string; endsOn: string; active: boolean };
/** Extra commission points for a product category on a given salon-local day: every matching running boost adds up, capped. */
export function boostFor(boosts: Boost[], category: string, today: string) {
  return boosts.filter((b) => b.active && b.startsOn <= today && today <= b.endsOn && (b.category === null || b.category === category)).reduce((a, b) => a + b.extraPct, 0);
}
export const effectivePct = (base: number, extra: number) => Math.min(50, base + extra);
