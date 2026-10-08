import { z } from "zod";
import { digits } from "@/lib/validate";

const text = (max: number) => z.string().trim().max(max);
const phone = z.string().transform((s) => digits(s).replace(/[\s-]/g, "")).pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست"));

export const orderBody = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(20) })).min(1, "سبد خرید خالی است").max(30),
  customerName: text(80).min(3, "نام و نام خانوادگی را وارد کنید"), phone,
  city: text(60).min(2, "شهر را وارد کنید"), address: text(300).min(8, "نشانی را کامل بنویسید"), postalCode: text(12).default(""),
  ref: text(60).optional(),
});
export const catalogQuery = z.object({ category: text(40).optional(), q: text(60).optional() });

const productFields = {
  name: text(120).min(3), brand: text(60), category: text(40).min(1), price: z.number().int().min(0).max(1_000_000_000),
  oldPrice: z.number().int().min(0).max(1_000_000_000).nullable(), commissionPct: z.number().int().min(0).max(50), stock: z.number().int().min(0).max(1_000_000),
  description: text(1000), active: z.boolean(),
};
export const productBody = z.object({ ...productFields, brand: productFields.brand.default(""), oldPrice: productFields.oldPrice.default(null), commissionPct: productFields.commissionPct.default(10), stock: productFields.stock.default(0), description: productFields.description.default(""), active: productFields.active.default(true) });
export const productPatch = z.object(productFields).partial();
export const statusBody = z.object({ status: z.enum(["SHIPPED", "DELIVERED", "RETURNED", "CANCELED"]), trackingCode: text(40).optional() });
export const trackBody = z.object({ number: z.number().int().min(1).max(100_000_000), phone });
export const adminOrdersQuery = z.object({ status: z.enum(["PENDING_PAYMENT", "PAID", "SHIPPED", "DELIVERED", "RETURNED", "CANCELED"]).optional() });
export const walletPlanBody = z.object({ planCode: z.string().min(1).max(40), months: z.number().int().min(1).max(12).default(1), partial: z.boolean().default(false) });
export const recommendQuery = z.object({ customerId: z.string().min(1).max(40) });

export const purchaseBody = z.object({
  supplier: text(80).min(2, "نام تأمین‌کننده را وارد کنید"), note: text(200).default(""),
  lines: z.array(z.object({ productId: z.string().min(1).max(40), qty: z.number().int().min(1).max(100_000), unitCost: z.number().int().min(0).max(1_000_000_000) })).min(1, "حداقل یک ردیف لازم است").max(50),
});
