"use client";
// Generic client for the backend (/api/v1). Session is an HttpOnly cookie, so nothing is stored in JS.

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

export async function api<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
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

const NICE: Record<string, string> = {
  VALIDATION_FAILED: "اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید.",
  MODULE_NOT_ACTIVE: "این بخش در پلن فعلی شما فعال نیست.",
  PLAN_LIMIT: "به سقف پلن رسیده‌اید؛ برای ادامه پلن را ارتقا دهید.",
  RATE_LIMITED: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
};
export function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return "خطای ناشناخته";
  if (e.code === "PLAN_LIMIT" || e.code === "RATE_LIMITED" || e.code === "MODULE_NOT_ACTIVE") return e.code === "PLAN_LIMIT" && e.message ? e.message : NICE[e.code];
  return e.code === "VALIDATION_FAILED" ? NICE.VALIDATION_FAILED : e.message;
}
