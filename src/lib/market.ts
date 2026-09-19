import type { DB } from "./db";
import type { Category } from "./mock";
import { findSlot } from "./booking";

export type Pro = {
  id: string; own: boolean; name: string; salon: string; city: string; cats: Category[]; rating: number; reviews: number; from: number; bio: string; works: number;
  tint: [string, string]; services: { name: string; price: number; min?: number }[]; slot: { day: number; start: number; staffId: string } | null; staffId?: string;
};

/** متخصص‌های همین سالن (زنده) + متخصص‌های سالن‌های دیگر پلتفرم */
export function listPros(d: DB): Pro[] {
  const own: Pro[] = d.staff.filter((s) => s.active && s.listed !== false).map((s) => {
    const svcs = d.services.filter((x) => x.active && x.staff.includes(s.id));
    const answered = d.surveys.filter((x) => x.staffId === s.id && x.rating);
    const first = svcs[0];
    return {
      id: `own-${s.id}`, own: true, staffId: s.id, name: s.name, salon: d.salon.name, city: d.salon.city, cats: [...new Set(svcs.map((x) => x.cat))],
      rating: s.rating, reviews: answered.length, from: svcs.length ? Math.min(...svcs.map((x) => x.price)) : 0, bio: s.bio || `${s.role} در ${d.salon.name}`,
      works: d.sales.filter((x) => x.status !== "باطل" && x.lines.some((l) => l.staffId === s.id)).length, tint: [s.color + "33", "#f6ecd6"],
      services: svcs.map((x) => ({ name: x.name, price: x.price, min: x.min })), slot: first ? findSlot(d, { serviceId: first.id, staffId: s.id, from: 0, to: 6 }) : null,
    };
  });
  const other: Pro[] = d.market.map((m) => ({ ...m, own: false, slot: null }));
  return [...own, ...other];
}
