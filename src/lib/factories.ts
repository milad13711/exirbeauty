import type { Customer, Service, StaffMember } from "./db";

const COLORS = ["#b4536f", "#b8924a", "#4f8a73", "#4a7fb0", "#8a5fb0", "#c8801e", "#3a8f9a"];
export const dayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export const newStaff = (n = 0): StaffMember => ({
  id: uid("s"), name: "", role: "", color: COLORS[n % COLORS.length], phone: "", rating: 0, revenue: 0, clients: 0, returning: 0, commission: 0, commissionPct: 30,
  avgInvoice: 0, fill: 0, products: 0, start: 0, end: 600, daysOff: [], breaks: [], leaves: [], active: true,
});
export const newService = (): Service => ({ id: uid("v"), cat: "مو", name: "", price: 0, min: 60, staff: [], materials: "", materialCost: 0, commission: 30, capacity: "۱ همزمان", active: true });
export const newCustomer = (): Customer => ({
  id: uid("c"), name: "", phone: "", gender: "زن", birth: "", tier: "برنزی", points: 0, nextRewardIn: 500, visits: 0, total: 0, avg: 0, lastVisit: "—", lastVisitDays: 0, cycleDays: 0, nextDue: "",
  favService: "", favStaff: "", occasions: [], allergies: [], note: "", tags: ["جدید"], referrals: 0, wallet: 0, risk: "ok", debt: 0, ptsLog: [], walletLog: [],
  hair: { current: "", type: "", state: "", brand: "", oxidant: "", lastColor: "", formula: "", history: [] },
  skin: { type: "", used: "", allergies: "", facials: [] }, nail: { services: "", colors: "", allergies: "" }, products: [], log: [],
});
/** ساعت (۹ تا ۱۹) ← دقیقه از ۹:۰۰ */
export const hourToMin = (h: number) => (h - 9) * 60;
export const minToHour = (m: number) => 9 + m / 60;
