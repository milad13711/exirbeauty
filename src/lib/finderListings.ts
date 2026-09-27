"use client";
// ثبت‌نام مستقل متخصص‌ها/سالن‌ها روی نقشه‌ی اکسیریاب — پلتفرمی و جدا از دیتابیس هر تننت.
// در فاز بک‌اند این لایه با API عمومی (بدون نیاز به ورود به پنل مدیریت) جایگزین می‌شود.
import { useSyncExternalStore } from "react";
import type { FinderCat } from "./finder";

export type FinderPlan = "free" | "artist" | "salon";

export const PLAN_INFO: Record<FinderPlan, { title: string; price: string; tagline: string; features: string[]; maxStaff: number }> = {
  free: {
    title: "رایگان", price: "۰ تومان", tagline: "فقط دیده شو",
    features: ["پین روی نقشه‌ی اکسیریاب", "قابل جست‌وجو بر اساس شهر و خدمت", "دریافت نظر و امتیاز از مشتری‌ها", "بدون داشبورد مدیریتی و بدون رزرو مستقیم"],
    maxStaff: 1,
  },
  artist: {
    title: "هنرمند", price: "ماهانه ۴۹۰ هزار تومان", tagline: "برای فعالیت تک‌نفره",
    features: ["همه‌ی امکانات پلن رایگان", "داشبورد اختصاصی مدیریت نوبت و مشتری", "پین ویژه و اولویت نمایش روی نقشه", "دریافت درخواست نوبت از مشتری‌های اکسیریاب"],
    maxStaff: 1,
  },
  salon: {
    title: "سالن", price: "ماهانه ۱٬۴۹۰ هزار تومان", tagline: "برای سالن با چند متخصص",
    features: ["همه‌ی امکانات پلن هنرمند", "تا ۱۰ متخصص، هرکدام پین جدا روی نقشه", "داشبورد مدیریتی برای مدیر سالن", "رزرو مستقیم آنلاین برای هر متخصص"],
    maxStaff: 10,
  },
};

export type ListingStaff = { name: string; cats: FinderCat[] };

export type FinderListing = {
  id: string; editCode: string; plan: FinderPlan; status: "pending" | "published" | "rejected";
  name: string; brand: string; phone: string; city: string; x: number; y: number; cats: FinderCat[]; bio: string;
  staff: ListingStaff[]; createdAt: number; updatedAt: number; rejectReason?: string;
  leads: { name: string; phone: string; note: string; day: number }[];
  reviews: { name: string; rating: number; text: string; at: number }[];
};

const KEY = "exir_finder_listings_v1";
let state: FinderListing[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}

function commit(next: FinderListing[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export const getListings = () => { load(); return state; };
export const useFinderListings = () => useSyncExternalStore(subscribe, getListings, () => [] as FinderListing[]);

function uid(p: string) { return `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`; }
function editCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

export const finderListings = {
  create(l: Omit<FinderListing, "id" | "editCode" | "status" | "createdAt" | "updatedAt" | "leads" | "reviews">): FinderListing {
    const now = Date.now();
    const rec: FinderListing = { ...l, id: uid("fl"), editCode: editCode(), status: "pending", createdAt: now, updatedAt: now, leads: [], reviews: [] };
    commit([rec, ...getListings()]);
    return rec;
  },
  findByCode(id: string, code: string): FinderListing | undefined {
    return getListings().find((x) => x.id === id && x.editCode.toUpperCase() === code.toUpperCase());
  },
  update(id: string, patch: Partial<FinderListing>) {
    commit(getListings().map((x) => (x.id === id ? { ...x, ...patch, status: "pending" as const, updatedAt: Date.now() } : x)));
  },
  setStatus(id: string, status: FinderListing["status"], rejectReason?: string) {
    commit(getListings().map((x) => (x.id === id ? { ...x, status, rejectReason, updatedAt: Date.now() } : x)));
  },
  addLead(id: string, lead: FinderListing["leads"][number]) {
    commit(getListings().map((x) => (x.id === id ? { ...x, leads: [lead, ...x.leads] } : x)));
  },
  addReview(id: string, review: Omit<FinderListing["reviews"][number], "at">) {
    commit(getListings().map((x) => (x.id === id ? { ...x, reviews: [{ ...review, at: Date.now() }, ...x.reviews] } : x)));
  },
  remove(id: string) { commit(getListings().filter((x) => x.id !== id)); },
};
