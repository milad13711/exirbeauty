"use client";
// لایه‌ی داده‌ی مشترک نمونه (فقط برای پروتوتایپ): محصولات، انبار، فاکتور خرید، تراکنش موجودی.
// در فاز بک‌اند جای این ماژول را API می‌گیرد؛ امضای اکشن‌ها همان می‌ماند.
import { useSyncExternalStore } from "react";
import { storeProducts, type SCat } from "./mock3";
import { appts as seedAppts, blocked as seedBlocked, staff as seedStaff, profile as seedProfile, customers as seedCustomerRows, type Appt, type Category, type Tier } from "./mock";
import { catalog as seedCatalog } from "./mock2";
import { defaultPlanModules, modulesAfterPlanChange } from "./modules";
import { seedExtra, seedOps, type SmsAccount, type SmsTx, type SmsMsg, type SmsPricing, type SmsPackage, type SmsLine, type TStatus, type Survey, type ReviewCfg, type Post, type Course, type Enrollment, type Notification, type Ticket, type Tenant, type MarketPro, type Sale, type Expense, type DebtPayment, type DayClosing, type StockItem, type WaitEntry, type Loyalty, type ReferralCfg, type Campaign, type AutoRule, type MembershipPlan, type Membership, type GiftCard } from "./seed-extra";
import { ordersSeed, salons as seedSalons, CRM_PLAN, type CommStatus, type OrderStatus } from "./mock3";

export type DBProduct = {
  id: string; name: string; brand: string; cat: SCat; price: number; old?: number; commission: number; rating: number;
  stock: number; tint: string[]; desc: string; active: boolean;
  cost: number;        // آخرین قیمت خرید (تومان)
  reorder: number;     // نقطه سفارش
  reorderQty: number;  // تعداد پیشنهادی سفارش
};
export type InvLine = { productId: string; qty: number; unitCost: number };
export type PurchaseInvoice = { id: string; supplier: string; date: string; lines: InvLine[]; status: "در راه" | "دریافت‌شده"; };
export type Movement = { id: string; date: string; productId: string; delta: number; note: string };
export type DBAppt = Appt & { day: number };

// ---------- خدمات ----------
export type Service = { id: string; cat: Category; name: string; price: number; min: number; staff: string[]; materials: string; materialCost: number; commission: number; capacity: string; discount?: string; pkg?: string; active: boolean };
// ---------- پرسنل ----------
export type Leave = { id: string; from: number; to: number; reason: string }; // بازه بر حسب فاصله‌ی روز از امروز
export type StaffMember = { id: string; name: string; role: string; color: string; phone: string; rating: number; revenue: number; clients: number; returning: number; commission: number; commissionPct: number; avgInvoice: number; fill: number; products: number; start: number; end: number; daysOff: number[]; breaks: { s: number; e: number; label: string }[]; leaves: Leave[]; active: boolean; listed?: boolean; bio?: string };
// ---------- مشتریان ----------
export type LogEntry = { id: string; d: string; s: string; by: string; cat: Category; price: number; photos: boolean; before?: string; after?: string };
export type Customer = {
  id: string; name: string; phone: string; gender: string; birth: string; age?: number; tier: Tier; points: number; nextRewardIn: number;
  visits: number; total: number; avg: number; lastVisit: string; lastVisitDays: number; cycleDays: number; nextDue: string;
  favService: string; favStaff: string; occasions: string[]; allergies: string[]; note: string; tags: string[]; referrals: number; wallet: number;
  risk: "ok" | "hot" | "lost"; debt: number; referredBy?: string; ptsLog: { d: string; delta: number; note: string }[]; walletLog: { d: string; delta: number; note: string }[];
  hair: { current: string; type: string; state: string; brand: string; oxidant: string; lastColor: string; formula: string; history: string[] };
  skin: { type: string; used: string; allergies: string; facials: string[] };
  nail: { services: string; colors: string; allergies: string };
  products: string[]; log: LogEntry[];
};
// ---------- سفارش‌های فروشگاه ----------
export type OrderLine = { productId: string; name: string; qty: number; price: number };
export type Order = { id: string; date: string; customer: string; phone: string; address?: string; lines: OrderLine[]; total: number; salon: string | null; via: string; status: OrderStatus; comm: number; cs: CommStatus; tracking?: string; reason?: string; log: string[] };
// ---------- تنظیمات، کاربران، اشتراک ----------
export type DayHours = { open: boolean; start: number; end: number }; // دقیقه از ۹:۰۰
export type SalonSettings = { name: string; phone: string; address: string; city: string; hours: DayHours[]; online: { enabled: boolean; autoConfirm: boolean; leadHours: number; cancelHours: number }; notify: { remind24: boolean; remind2: boolean; birthday: boolean; review: boolean } };
export type Perm = "none" | "view" | "edit";
export const permModules = ["مشتریان", "تقویم", "خدمات", "پرسنل", "صندوق", "انبار و فروشگاه", "بازاریابی", "تنظیمات"] as const;
export type SalonRole = { id: string; name: string; perms: Record<string, Perm> };
export type SalonUser = { id: string; name: string; phone: string; roleId: string; active: boolean };
export type AdminUser = { id: string; name: string; email: string; role: string; active: boolean };
export const adminRoles = [{ id: "super", name: "سوپرادمین", desc: "دسترسی کامل" }, { id: "support", name: "پشتیبانی", desc: "تننت‌ها و سفارش‌ها" }, { id: "finance", name: "مالی", desc: "پورسانت‌ها، کیف پول و فاکتور خرید" }, { id: "content", name: "محتوا", desc: "محصولات و دوره‌ها" }] as const;
export type Subscription = { planId: string; status: "فعال" | "آزمایشی" | "منقضی‌شده"; expiry: string; months: number };
export type Session = { role: "owner" | "admin"; name: string } | null;

export type DB = {
  products: DBProduct[]; invoices: PurchaseInvoice[]; moves: Movement[]; seq: number; appts: DBAppt[];
  services: Service[]; staff: StaffMember[]; customers: Customer[]; orders: Order[]; wallets: Record<string, number>; orderSeq: number;
  salon: SalonSettings; roles: SalonRole[]; users: SalonUser[]; adminUsers: AdminUser[]; sub: Subscription; onboarded: boolean; session: Session;
  modules: { installed: string[]; addons: string[] }; planModules: Record<string, string[]>; modulePrices: Record<string, number>;
  surveys: Survey[]; reviewCfg: ReviewCfg; posts: Post[]; courses: Course[]; enrollments: Enrollment[]; notifications: Notification[]; tickets: Ticket[]; tenants: Tenant[]; market: MarketPro[];
  smsAccounts: SmsAccount[]; smsTx: SmsTx[]; smsLog: SmsMsg[]; smsPricing: SmsPricing;
  inv: StockItem[]; sales: Sale[]; expenses: Expense[]; debtPays: DebtPayment[]; closings: DayClosing[]; saleSeq: number; waitlist: WaitEntry[];
  loyalty: Loyalty; referral: ReferralCfg; campaigns: Campaign[]; automations: AutoRule[]; memPlans: MembershipPlan[]; memberships: Membership[]; giftCards: GiftCard[]; portal: string | null;
};
export type { SmsAccount, SmsTx, SmsMsg, SmsPricing, SmsPackage, SmsLine, TStatus, Survey, ReviewCfg, Post, Course, Enrollment, Notification, Ticket, Tenant, MarketPro, Sale, Expense, DebtPayment, DayClosing, StockItem, WaitEntry, Loyalty, ReferralCfg, Campaign, AutoRule, MembershipPlan, Membership, GiftCard };

export const suppliers = ["پخش رز", "آرین‌مد", "شرکت سیلک‌لب", "درماکو"];
export const TODAY_SHORT = "۲۸ شهریور";

function mkFull(r: Record<string, unknown>): Customer {
  const base: Customer = {
    id: "", name: "", phone: "", gender: "زن", birth: "", tier: "برنزی", points: 0, nextRewardIn: 500, visits: 0, total: 0, avg: 0, lastVisit: "—", lastVisitDays: 0, cycleDays: 0, nextDue: "",
    favService: "", favStaff: "", occasions: [], allergies: [], note: "", tags: [], referrals: 0, wallet: 0, risk: "ok", debt: 0, ptsLog: [], walletLog: [],
    hair: { current: "", type: "", state: "", brand: "", oxidant: "", lastColor: "", formula: "", history: [] },
    skin: { type: "", used: "", allergies: "", facials: [] }, nail: { services: "", colors: "", allergies: "" }, products: [], log: [],
  };
  const merged = { ...base, ...r } as Customer;
  merged.avg = merged.avg || (merged.visits ? Math.round(merged.total / merged.visits) : 0);
  merged.log = (merged.log ?? []).map((l, i) => ({ ...l, id: l.id ?? `l${i}` }));
  return merged;
}
const productNameOf: Record<string, string> = Object.fromEntries(storeProducts.map((p) => [p.id, p.name]));
function seedOrders(): Order[] {
  const L = (ids: [string, number][]): OrderLine[] => ids.map(([id, qty]) => { const p = storeProducts.find((x) => x.id === id)!; return { productId: id, name: productNameOf[id], qty, price: p.price }; });
  const mk = (o: (typeof ordersSeed)[number], lines: OrderLine[], status: OrderStatus, cs: CommStatus): Order => {
    const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const comm = status === "مرجوعی" ? 0 : lines.reduce((a, l) => a + Math.round((l.price * l.qty * (storeProducts.find((x) => x.id === l.productId)!.commission)) / 100), 0);
    return { id: o.id, date: o.date, customer: o.customer, phone: o.phone, lines, total, salon: o.salon, via: o.via, status, comm, cs, log: [`${o.date} · ثبت و پرداخت سفارش`] };
  };
  const o = Object.fromEntries(ordersSeed.map((x) => [x.id, x]));
  return [
    mk(o["۲۰۳۱"], L([["p6", 1]]), "پرداخت‌شده", "در انتظار تحویل"),
    mk(o["۲۰۳۰"], L([["p3", 1], ["p4", 1]]), "ارسال‌شده", "در انتظار تحویل"),
    mk(o["۲۰۲۹"], L([["p2", 1]]), "تحویل‌شده", "آماده شارژ"),
    mk(o["۲۰۲۸"], L([["p1", 1]]), "تحویل‌شده", "آماده شارژ"),
    mk(o["۲۰۲۷"], L([["p7", 1]]), "تحویل‌شده", "شارژ شد"),
    mk(o["۲۰۲۶"], L([["p3b", 1]]), "مرجوعی", "لغو شد"),
    mk(o["۲۰۲۵"], L([["p5", 1], ["p2", 1]]), "تحویل‌شده", "شارژ شد"),
  ];
}

const seedProducts: DBProduct[] = storeProducts.map((p) => ({
  ...p, active: true, cost: Math.round((p.price * 0.55) / 1000) * 1000, reorder: 15, reorderQty: 30,
}));
// دمو: یک کالای ناموجود و چند کالای زیر نقطه سفارش
const tweak: Record<string, Partial<DBProduct>> = { p5: { stock: 0, reorder: 12 }, p3: { stock: 8, reorder: 15 }, p3b: { stock: 6, reorder: 10, reorderQty: 20 }, p6: { stock: 15, reorder: 8 } };
const seedBase: Omit<DB, keyof ReturnType<typeof seedExtra> | keyof ReturnType<typeof seedOps>> = {
  modules: { installed: [...defaultPlanModules.pro], addons: [] }, planModules: defaultPlanModules, modulePrices: {},
  products: seedProducts.map((p) => ({ ...p, ...(tweak[p.id] ?? {}) })),
  invoices: [{ id: "خ-۱۰۰۱", supplier: "پخش رز", date: "۱۴ شهریور", lines: [{ productId: "p1", qty: 40, unitCost: 360_000 }, { productId: "p2", qty: 25, unitCost: 430_000 }], status: "دریافت‌شده" }],
  moves: [
    { id: "m1", date: "۱۴ شهریور", productId: "p1", delta: 40, note: "ورود · فاکتور خ-۱۰۰۱" },
    { id: "m2", date: "۱۴ شهریور", productId: "p2", delta: 25, note: "ورود · فاکتور خ-۱۰۰۱" },
    { id: "m3", date: "۲۰ شهریور", productId: "p1", delta: -3, note: "خروج · سفارش ۲۰۲۹" },
  ],
  seq: 1002,
  appts: seedAppts.map((a) => ({ ...a, day: 0 })),
  services: seedCatalog.map((c) => ({ ...c })) as Service[],
  staff: seedStaff.map((m, i) => ({
    id: m.id, name: m.name, role: m.role, color: m.color, phone: ["۰۹۱۲۱۰۰۱۱۱۱", "۰۹۱۲۱۰۰۲۲۲۲", "۰۹۱۲۱۰۰۳۳۳۳", "۰۹۱۲۱۰۰۴۴۴۴"][i], rating: m.rating, revenue: m.revenue, clients: m.clients,
    returning: m.returning, commission: m.commission, commissionPct: [30, 28, 30, 33][i], avgInvoice: m.avgInvoice, fill: m.fill, products: m.products,
    start: 0, end: 600, daysOff: m.id === "s4" ? [3] : [], breaks: seedBlocked[m.id]?.filter((b) => b.label !== "مرخصی ساعتی") ?? [], leaves: [], active: true,
  })),
  customers: [mkFull(seedProfile), ...seedCustomerRows.slice(1).map((r) => mkFull(r as unknown as Record<string, unknown>))].map((c) => (c.name === "الناز جعفری" ? { ...c, debt: 850_000 } : c)),
  orders: seedOrders(),
  wallets: Object.fromEntries(seedSalons.map((x) => [x.id, x.wallet])),
  orderSeq: 2032,
  salon: { name: "سالن رُز", phone: "۰۲۱۸۸۰۰۱۱۲۲", address: "تهران، ونک، خیابان ملاصدرا، پلاک ۱۲", city: "تهران", hours: Array.from({ length: 7 }, (_, i) => ({ open: i !== 6, start: 0, end: 600 })), online: { enabled: true, autoConfirm: false, leadHours: 2, cancelHours: 12 }, notify: { remind24: true, remind2: true, birthday: true, review: true } },
  roles: [
    { id: "r1", name: "مدیر", perms: Object.fromEntries(permModules.map((m) => [m, "edit"])) },
    { id: "r2", name: "پذیرش", perms: { "مشتریان": "edit", "تقویم": "edit", "خدمات": "view", "پرسنل": "view", "صندوق": "edit", "انبار و فروشگاه": "view", "بازاریابی": "none", "تنظیمات": "none" } },
    { id: "r3", name: "متخصص", perms: { "مشتریان": "view", "تقویم": "edit", "خدمات": "view", "پرسنل": "none", "صندوق": "none", "انبار و فروشگاه": "none", "بازاریابی": "none", "تنظیمات": "none" } },
    { id: "r4", name: "حسابدار", perms: { "مشتریان": "view", "تقویم": "none", "خدمات": "view", "پرسنل": "view", "صندوق": "edit", "انبار و فروشگاه": "edit", "بازاریابی": "none", "تنظیمات": "none" } },
  ],
  users: [
    { id: "u1", name: "مهسا رحیمی", phone: "۰۹۱۲۱۱۱۲۲۳۳", roleId: "r1", active: true },
    { id: "u2", name: "زهرا کاظمی", phone: "۰۹۱۲۵۵۵۶۶۷۷", roleId: "r2", active: true },
    { id: "u3", name: "مریم حسینی", phone: "۰۹۱۲۱۰۰۱۱۱۱", roleId: "r3", active: true },
  ],
  adminUsers: [
    { id: "a1", name: "میلاد", email: "milad@exirbeauty.ir", role: "super", active: true },
    { id: "a2", name: "نگین مالی", email: "finance@exirbeauty.ir", role: "finance", active: true },
    { id: "a3", name: "پشتیبان ۱", email: "support@exirbeauty.ir", role: "support", active: true },
  ],
  sub: { planId: "pro", status: "فعال", expiry: CRM_PLAN.renewal, months: 1 },
  onboarded: true,
  session: null,
};
export const seedDB: DB = {
  ...seedBase,
  ...seedOps(),
  appts: seedBase.appts.map((a) => ({ ...a, customerId: seedBase.customers.find((c) => c.name === a.client)?.id })),
  ...seedExtra({
    services: seedBase.services, staff: seedBase.staff, customers: seedBase.customers,
    retail: [
      { id: "r1", name: "شامپو ترمیم‌کننده", kind: "retail", price: 650_000, cost: 360_000, stock: 12, reorder: 5, supplier: "پخش رز" },
      { id: "r2", name: "ماسک مو ابریشم", kind: "retail", price: 780_000, cost: 430_000, stock: 9, reorder: 5, supplier: "پخش رز" },
      { id: "r3", name: "سرم ویتامین C", kind: "retail", price: 1_150_000, cost: 620_000, stock: 6, reorder: 4, supplier: "درماکو" },
      { id: "r4", name: "ضدآفتاب SPF50", kind: "retail", price: 540_000, cost: 300_000, stock: 14, reorder: 6, supplier: "درماکو" },
    ],
  }),
};

const KEY = "exir_db_v7";
let state: DB = seedDB;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...seedDB, ...(JSON.parse(raw) as Partial<DB>) };
  } catch {}
}
export const getDB = () => { load(); return state; };
export function commit(next: DB) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useDB = () => useSyncExternalStore(subscribe, getDB, () => seedDB);

function patchOrder(id: string, fn: (o: Order) => Order) { const d = getDB(); commit({ ...d, orders: d.orders.map((o) => (o.id === id ? fn(o) : o)) }); }

export type StockState = "ناموجود" | "زیر نقطه سفارش" | "کافی";
export const stockState = (p: DBProduct): StockState => (p.stock <= 0 ? "ناموجود" : p.stock <= p.reorder ? "زیر نقطه سفارش" : "کافی");
export const invoiceTotal = (i: PurchaseInvoice) => i.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);

export const actions = {
  saveProduct(p: DBProduct) {
    const d = getDB();
    const exists = d.products.some((x) => x.id === p.id);
    commit({ ...d, products: exists ? d.products.map((x) => (x.id === p.id ? p : x)) : [p, ...d.products] });
  },
  setReorder(id: string, reorder: number, reorderQty: number) {
    const d = getDB();
    commit({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, reorder, reorderQty } : p)) });
  },
  /** ثبت فاکتور خرید؛ اگر بار رسیده باشد موجودی همان لحظه خودکار شارژ می‌شود */
  createInvoice(supplier: string, lines: InvLine[], receiveNow: boolean) {
    const d = getDB();
    const inv: PurchaseInvoice = { id: `خ-${String(d.seq).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])}`, supplier, date: TODAY_SHORT, lines, status: "در راه" };
    commit({ ...d, invoices: [inv, ...d.invoices], seq: d.seq + 1 });
    if (receiveNow) actions.receiveInvoice(inv.id);
    return inv.id;
  },
  receiveInvoice(id: string) {
    const d = getDB();
    const inv = d.invoices.find((i) => i.id === id);
    if (!inv || inv.status === "دریافت‌شده") return;
    const add = new Map<string, InvLine[]>();
    inv.lines.forEach((l) => add.set(l.productId, [...(add.get(l.productId) ?? []), l]));
    commit({
      ...d,
      invoices: d.invoices.map((i) => (i.id === id ? { ...i, status: "دریافت‌شده" } : i)),
      products: d.products.map((p) => { const ls = add.get(p.id); return ls ? { ...p, stock: p.stock + ls.reduce((a, l) => a + l.qty, 0), cost: ls[ls.length - 1].unitCost } : p; }),
      moves: [...inv.lines.map((l, i) => ({ id: `${id}-${i}-${d.moves.length}`, date: TODAY_SHORT, productId: l.productId, delta: l.qty, note: `ورود · فاکتور ${id}` })), ...d.moves],
    });
  },
  // ---------- سفارش‌های فروشگاه ----------
  /** ثبت سفارش فروشگاه: کسر موجودی + محاسبه‌ی پورسانت سالن معرف */
  createOrder(input: { customer: string; phone: string; address: string; lines: Record<string, number>; salon: string | null; via: string }) {
    const d = getDB();
    const lines: OrderLine[] = Object.entries(input.lines).map(([productId, qty]) => { const p = d.products.find((x) => x.id === productId)!; return { productId, name: p.name, qty, price: p.price }; });
    const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const comm = input.salon ? lines.reduce((a, l) => a + Math.round((l.price * l.qty * d.products.find((x) => x.id === l.productId)!.commission) / 100), 0) : 0;
    const id = String(d.orderSeq).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c]);
    const order: Order = { id, date: TODAY_SHORT, customer: input.customer, phone: input.phone, address: input.address, lines, total, salon: input.salon, via: input.via, status: "پرداخت‌شده", comm, cs: input.salon ? "در انتظار تحویل" : "بدون پورسانت", log: [`${TODAY_SHORT} · ثبت و پرداخت سفارش`] };
    commit({
      ...d, orderSeq: d.orderSeq + 1, orders: [order, ...d.orders],
      products: d.products.map((p) => (input.lines[p.id] ? { ...p, stock: Math.max(0, p.stock - input.lines[p.id]) } : p)),
      moves: [...lines.map((l, i) => ({ id: `s-${id}-${i}`, date: TODAY_SHORT, productId: l.productId, delta: -l.qty, note: `خروج · سفارش ${id}` })), ...d.moves],
    });
    return id;
  },
  shipOrder(id: string, tracking: string) { patchOrder(id, (o) => (o.status === "پرداخت‌شده" ? { ...o, status: "ارسال‌شده", tracking, log: [...o.log, `${TODAY_SHORT} · ارسال شد (رهگیری ${tracking})`] } : o)); },
  deliverOrder(id: string) { patchOrder(id, (o) => (o.status === "ارسال‌شده" ? { ...o, status: "تحویل‌شده", cs: o.salon && o.comm ? "در انتظار مهلت مرجوعی" : o.cs, log: [...o.log, `${TODAY_SHORT} · تحویل شد؛ مهلت مرجوعی شروع شد`] } : o)); },
  /** پایان مهلت مرجوعی ← پورسانت قابل شارژ */
  endReturnWindow(id: string) { patchOrder(id, (o) => (o.cs === "در انتظار مهلت مرجوعی" ? { ...o, cs: "آماده شارژ", log: [...o.log, `${TODAY_SHORT} · مهلت مرجوعی تمام شد`] } : o)); },
  chargeCommissions(ids: string[]) {
    const d = getDB();
    const hit = d.orders.filter((o) => ids.includes(o.id) && o.cs === "آماده شارژ" && o.salon);
    const wallets = { ...d.wallets };
    hit.forEach((o) => { wallets[o.salon!] = (wallets[o.salon!] ?? 0) + o.comm; });
    commit({ ...d, wallets, orders: d.orders.map((o) => (hit.some((h) => h.id === o.id) ? { ...o, cs: "شارژ شد", log: [...o.log, `${TODAY_SHORT} · پورسانت به کیف پول سالن شارژ شد`] } : o)) });
  },
  /** مرجوعی یا لغو: موجودی به انبار برمی‌گردد و پورسانت لغو می‌شود (اگر قبلاً شارژ شده، از کیف پول کسر می‌شود) */
  returnOrder(id: string, reason: string, kind: "مرجوعی" | "لغو") {
    const d = getDB();
    const o = d.orders.find((x) => x.id === id);
    if (!o || o.status === "مرجوعی" || (kind === "لغو" && o.status !== "پرداخت‌شده")) return;
    const wallets = { ...d.wallets };
    let note = "";
    if (o.cs === "شارژ شد" && o.salon) { wallets[o.salon] = (wallets[o.salon] ?? 0) - o.comm; note = " · پورسانت از کیف پول سالن کسر شد"; }
    commit({
      ...d, wallets,
      orders: d.orders.map((x) => (x.id === id ? { ...x, status: "مرجوعی", reason, comm: 0, cs: x.salon ? "لغو شد" : "بدون پورسانت", log: [...x.log, `${TODAY_SHORT} · ${kind} ثبت شد (${reason || "بدون دلیل"})${note}`] } : x)),
      products: d.products.map((p) => { const l = o.lines.find((x) => x.productId === p.id); return l ? { ...p, stock: p.stock + l.qty } : p; }),
      moves: [...o.lines.map((l, i) => ({ id: `r-${id}-${i}-${d.moves.length}`, date: TODAY_SHORT, productId: l.productId, delta: l.qty, note: `ورود · ${kind} سفارش ${id}` })), ...d.moves],
    });
  },

  // ---------- خدمات ----------
  saveService(sv: Service) { const d = getDB(); commit({ ...d, services: d.services.some((x) => x.id === sv.id) ? d.services.map((x) => (x.id === sv.id ? sv : x)) : [...d.services, sv] }); },
  deleteService(id: string) { const d = getDB(); commit({ ...d, services: d.services.filter((x) => x.id !== id) }); },
  // ---------- پرسنل ----------
  saveStaff(m: StaffMember) { const d = getDB(); commit({ ...d, staff: d.staff.some((x) => x.id === m.id) ? d.staff.map((x) => (x.id === m.id ? m : x)) : [...d.staff, m] }); },
  deleteStaff(id: string) { const d = getDB(); commit({ ...d, staff: d.staff.filter((x) => x.id !== id), services: d.services.map((sv) => ({ ...sv, staff: sv.staff.filter((x) => x !== id) })) }); },
  // ---------- مشتریان ----------
  saveCustomer(c: Customer) { const d = getDB(); commit({ ...d, customers: d.customers.some((x) => x.id === c.id) ? d.customers.map((x) => (x.id === c.id ? c : x)) : [c, ...d.customers] }); },
  deleteCustomer(id: string) { const d = getDB(); commit({ ...d, customers: d.customers.filter((x) => x.id !== id) }); },
  addLog(customerId: string, e: LogEntry) {
    const d = getDB();
    commit({ ...d, customers: d.customers.map((c) => (c.id === customerId ? { ...c, log: [e, ...c.log], visits: c.visits + 1, total: c.total + e.price, avg: Math.round((c.total + e.price) / (c.visits + 1)), lastVisit: e.d, lastVisitDays: 0, points: c.points + 50 } : c)) });
  },
  // ---------- تنظیمات و کاربران ----------
  saveSalon(patch: Partial<SalonSettings>) { const d = getDB(); commit({ ...d, salon: { ...d.salon, ...patch } }); },
  saveRole(r: SalonRole) { const d = getDB(); commit({ ...d, roles: d.roles.some((x) => x.id === r.id) ? d.roles.map((x) => (x.id === r.id ? r : x)) : [...d.roles, r] }); },
  deleteRole(id: string) { const d = getDB(); commit({ ...d, roles: d.roles.filter((x) => x.id !== id) }); },
  saveUser(u: SalonUser) { const d = getDB(); commit({ ...d, users: d.users.some((x) => x.id === u.id) ? d.users.map((x) => (x.id === u.id ? u : x)) : [...d.users, u] }); },
  deleteUser(id: string) { const d = getDB(); commit({ ...d, users: d.users.filter((x) => x.id !== id) }); },
  saveAdminUser(u: AdminUser) { const d = getDB(); commit({ ...d, adminUsers: d.adminUsers.some((x) => x.id === u.id) ? d.adminUsers.map((x) => (x.id === u.id ? u : x)) : [...d.adminUsers, u] }); },
  deleteAdminUser(id: string) { const d = getDB(); commit({ ...d, adminUsers: d.adminUsers.filter((x) => x.id !== id) }); },
  // ---------- ورود، ثبت‌نام، اشتراک ----------
  login(role: "owner" | "admin", name: string) { const d = getDB(); commit({ ...d, session: { role, name } }); },
  logout() { const d = getDB(); commit({ ...d, session: null }); },
  /** ثبت‌نام سالن جدید + فعال‌سازی اشتراک (پرداخت‌شده یا دوره‌ی آزمایشی ۷ روزه) */
  signup(p: { owner: string; salonName: string; phone: string; city: string; planId: string; months: number; trial: boolean }) {
    const d = getDB();
    const fd = (n: number) => String(n).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c]);
    const expiry = p.trial ? "۷ روز دیگر" : p.months === 1 ? "۲۸ مهر ۱۴۰۵" : `${fd(p.months)} ماه دیگر`;
    const price = ({ basic: 790_000, pro: 1_490_000, elite: 2_900_000 } as Record<string, number>)[p.planId] ?? 0;
    const tenant: Tenant = { id: `t${Date.now().toString(36)}`, name: p.salonName, owner: p.owner, city: p.city, phone: p.phone, plan: p.planId, status: p.trial ? "آزمایشی" : "فعال", expiry, users: 1, customers: 0, wallet: 0, since: "شهریور ۱۴۰۵", notes: [p.trial ? "ثبت‌نام با دوره‌ی آزمایشی" : "ثبت‌نام با پرداخت آنلاین"], payments: p.trial ? [] : [{ day: 0, amount: price * p.months, label: `اشتراک ${fd(p.months)} ماهه — آنلاین` }] };
    const note: Notification = { id: `n${Date.now().toString(36)}`, audience: "admin", title: "سالن جدید", body: `${p.salonName} (${p.city}) ${p.trial ? "دوره‌ی آزمایشی را شروع کرد" : "اشتراک خرید"}`, href: "/admin/tenants", day: 0, read: false };
    commit({ ...d, modules: { installed: [...(d.planModules[p.planId] ?? [])], addons: [] }, salon: { ...d.salon, name: p.salonName, phone: p.phone, city: p.city }, sub: { planId: p.planId, status: p.trial ? "آزمایشی" : "فعال", expiry, months: p.months }, onboarded: false, session: { role: "owner", name: p.owner }, tenants: [tenant, ...d.tenants], notifications: [note, ...d.notifications].slice(0, 80), smsAccounts: [...d.smsAccounts, { tenantId: tenant.id, balance: 50, line: { kind: "shared", number: "30005050", status: "فعال", requestedAt: 0 }, autoRecharge: { on: false, threshold: 150, packageId: "p2", source: "online" }, lowAlertSent: false, sent30: 0, lastTopup: 0, optOut: true }], smsTx: [{ id: `x${Date.now().toString(36)}`, tenantId: tenant.id, day: 0, kind: "هدیه", amount: 0, credits: 50, method: "—", note: "هدیه‌ی ثبت‌نام: ۵۰ پیامک" }, ...d.smsTx] });
  },
  paySubscription(planId: string, months: number, fromWallet: number) {
    const d = getDB();
    commit({ ...d, modules: modulesAfterPlanChange(d, planId), wallets: { ...d.wallets, s1: Math.max(0, (d.wallets.s1 ?? 0) - fromWallet) }, sub: { planId, status: "فعال", expiry: months === 1 ? "۲۸ مهر ۱۴۰۵" : `${String(months).replace(/\d/g, (c) => "۰۱۲۳۴۵۶۷۸۹"[+c])} ماه دیگر`, months } });
  },
  /** پایان Onboarding: خدمات و متخصص‌های انتخابی به سالن اضافه می‌شوند (بدون حذف موارد موجود) */
  finishOnboarding(svcs: Service[], staffList: StaffMember[]) {
    const d = getDB();
    const names = new Set(d.services.map((x) => x.name));
    const snames = new Set(d.staff.map((x) => x.name));
    commit({ ...d, onboarded: true, services: [...d.services, ...svcs.filter((x) => !names.has(x.name))], staff: [...d.staff, ...staffList.filter((x) => !snames.has(x.name))] });
  },
  addAppts(list: DBAppt[]) { const d = getDB(); commit({ ...d, appts: [...d.appts, ...list] }); },
  setApptStatus(id: string, status: Appt["status"]) { const d = getDB(); commit({ ...d, appts: d.appts.map((a) => (a.id === id ? { ...a, status } : a)) }); },
  cancelAppt(id: string) { const d = getDB(); commit({ ...d, appts: d.appts.filter((a) => a.id !== id) }); },
  reset() { commit(seedDB); },
};
