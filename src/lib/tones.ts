import type { Tone } from "@/components/ui";
import type { CommStatus, OrderStatus } from "./mock3";

export const orderTone: Record<OrderStatus, Tone> = { "پرداخت‌شده": "sky", "ارسال‌شده": "amber", "تحویل‌شده": "sage", "مرجوعی": "danger" };
export const commTone: Record<CommStatus, Tone> = { "در انتظار مهلت مرجوعی": "amber", "آماده شارژ": "sky", "شارژ شد": "sage", "لغو شد": "neutral" };
