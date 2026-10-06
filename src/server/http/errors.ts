export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "ورود لازم است") => new HttpError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "دسترسی ندارید", code = "FORBIDDEN", details?: unknown) => new HttpError(403, code, msg, details);
export const notFound = (msg = "پیدا نشد") => new HttpError(404, "NOT_FOUND", msg);
export const conflict = (msg: string, code = "CONFLICT", details?: unknown) => new HttpError(409, code, msg, details);
export const tooMany = (msg = "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره تلاش کنید") => new HttpError(429, "RATE_LIMITED", msg);
