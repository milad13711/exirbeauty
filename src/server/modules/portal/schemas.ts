import { z } from "zod";
import { digits } from "@/lib/validate";

const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));
export const requestBody = z.object({ phone });
export const verifyBody = z.object({ phone, code: z.string().transform((s) => digits(s).trim()).pipe(z.string().regex(/^\d{6}$/)), name: z.string().trim().min(3, "نام و نام خانوادگی را وارد کنید").max(80).optional(), ref: z.string().trim().max(20).optional() });
export const profilePatch = z.object({ name: z.string().trim().min(3).max(80).optional(), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }).refine((b) => b.name !== undefined || b.birthDate !== undefined, "چیزی برای تغییر ارسال نشده");
