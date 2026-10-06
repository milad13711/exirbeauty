"use client";
// Client for the finder module's API (src/server/modules/finder). Replaces the old localStorage mock.
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
export type ListingStatus = "PENDING" | "PUBLISHED" | "REJECTED";

/** Fields an owner edits (same shape the API validates). */
export type ListingInput = { name: string; brand?: string; phone: string; city: string; x: number; y: number; cats: FinderCat[]; bio: string; staff: ListingStaff[] };

export type PublicListing = {
  id: string; name: string; brand: string; phone: string; city: string; x: number; y: number; cats: FinderCat[]; bio: string; plan: FinderPlan;
  staff: { id: string; name: string; cats: FinderCat[] }[]; rating: number; reviewCount: number;
};
export type PublicReview = { id: string; name: string; rating: number; text: string; createdAt: string };
export type PublicDetail = PublicListing & { reviews: PublicReview[] };

export type OwnerView = ListingInput & {
  id: string; status: ListingStatus; rejectReason: string | null; plan: FinderPlan; planLimits: { staff?: number; leads?: boolean };
  pendingEdit: ListingInput | null; leads: { id: string; name: string; phone: string; note: string; createdAt: string }[];
};

export type AdminListing = PublicListing & {
  status: ListingStatus; rejectReason: string | null; pendingEdit: ListingInput | null; planTitle: string; leadCount: number; reviewCount: number; updatedAt: string;
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

async function api<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method, headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, "NETWORK", "ارتباط با سرور برقرار نشد؛ اینترنت را بررسی کنید.");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.error?.code ?? "ERROR", json?.error?.message ?? "خطای نامشخص", json?.error?.details);
  return json.data as T;
}

const code = (c: string) => ({ "x-edit-code": c.trim() });

export const finderApi = {
  list: (q: { city?: string; cat?: string; q?: string } = {}) => api<PublicListing[]>("GET", `/finder/listings?${new URLSearchParams(Object.entries(q).filter(([, v]) => v) as [string, string][])}`),
  detail: (id: string) => api<PublicDetail>("GET", `/finder/listings/${id}`),
  create: (body: ListingInput & { plan: FinderPlan }) => api<{ id: string; editCode: string; status: ListingStatus }>("POST", "/finder/listings", body),
  review: (id: string, r: { name: string; rating: number; text: string }) => api<{ id: string }>("POST", `/finder/listings/${id}/reviews`, r),
  lead: (id: string, l: { name: string; phone: string; note: string }) => api<{ id: string }>("POST", `/finder/listings/${id}/leads`, l),
  manage: (id: string, c: string) => api<OwnerView>("GET", `/finder/listings/${encodeURIComponent(id)}/manage`, undefined, code(c)),
  edit: (id: string, c: string, body: ListingInput) => api<{ status: ListingStatus; pendingEdit: boolean }>("PUT", `/finder/listings/${id}`, body, code(c)),

  login: (email: string, password: string) => api<{ id: string; name: string; role: string }>("POST", "/auth/login", { email, password }),
  adminList: (status?: ListingStatus) => api<AdminListing[]>("GET", `/admin/finder/listings${status ? `?status=${status}` : ""}`),
  approve: (id: string) => api<{ applied: string }>("POST", `/admin/finder/listings/${id}/approve`, {}),
  reject: (id: string, reason: string) => api<{ rejected: string }>("POST", `/admin/finder/listings/${id}/reject`, { reason }),
  unpublish: (id: string, reason: string) => api<{ ok: true }>("POST", `/admin/finder/listings/${id}/unpublish`, { reason }),
};

export const errorText = (e: unknown) => (e instanceof ApiError ? (e.status === 422 ? "اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید." : e.message) : "خطای ناشناخته");
