import { defineModule } from "../platform/modules/types";

// Modules whose backend routes aren't built yet. They already take part in plans, add-ons and
// entitlement checks; when one gets real routes, move it to its own folder (see ./finder) and add `routes`.
// Distribution: artist = solo dashboard; salon = full team suite; ai & network are add-on only.

const ARTIST = ["artist", "salon"];
const SALON = ["salon"];

export const catalogModules = [
  // ── core CRM (always on once the plan includes them)
  defineModule({ id: "calendar", name: "نوبت‌دهی و تقویم", description: "تقویم، رزرو آنلاین، لیست انتظار", category: "هسته", scope: "TENANT", core: true, defaultPlans: ARTIST }),
  defineModule({ id: "services", name: "تعریف خدمات", description: "خدمات، قیمت و مدت", category: "هسته", scope: "TENANT", core: true, defaultPlans: ARTIST }),
  defineModule({ id: "staff", name: "مدیریت متخصص‌ها", description: "پرسنل، ساعت کاری و مرخصی", category: "هسته", scope: "TENANT", core: true, defaultPlans: ARTIST }),
  defineModule({ id: "customers", name: "پروفایل و پرونده‌ی زیبایی مشتری", description: "پرونده‌ی ۳۶۰ درجه‌ی مشتری", category: "هسته", scope: "TENANT", core: true, defaultPlans: ARTIST }),

  // ── operations
  defineModule({ id: "cashier", name: "صندوق و درآمد", description: "فاکتور، پرداخت ترکیبی، هزینه، بدهی و بستن روز", category: "عملیات", scope: "TENANT", addonPrice: 390_000, defaultPlans: ARTIST }),
  defineModule({ id: "inventory", name: "انبار و تأمین", description: "موجودی، نقطه سفارش و ورود کالا", category: "عملیات", scope: "TENANT", addonPrice: 290_000, defaultPlans: SALON }),
  defineModule({ id: "reports", name: "گزارش‌ها و خروجی Excel", description: "گزارش فروش، خدمات، متخصص و مشتری", category: "عملیات", scope: "TENANT", addonPrice: 250_000, defaultPlans: ARTIST }),

  // ── customer communication
  defineModule({ id: "sms", name: "پیامک و سناریوهای خودکار", description: "خط اختصاصی، اعتبار لحظه‌ای و ارسال خودکار با کنترل کامل", category: "ارتباط با مشتری", scope: "TENANT", addonPrice: 0, defaultPlans: ARTIST }),
  defineModule({ id: "campaigns", name: "کمپین و بازاریابی", description: "ساخت کمپین با شرط‌های ترکیبی مخاطب", category: "ارتباط با مشتری", scope: "TENANT", requires: ["sms"], addonPrice: 290_000, defaultPlans: SALON }),
  defineModule({ id: "reviews", name: "نظرسنجی و اعتبار", description: "نظرسنجی خودکار بعد از خدمت و مدیریت شکایت", category: "ارتباط با مشتری", scope: "TENANT", addonPrice: 190_000, defaultPlans: ARTIST }),

  // ── loyalty
  defineModule({ id: "loyalty", name: "باشگاه مشتریان", description: "سطح، امتیاز و جایزه", category: "وفاداری", scope: "TENANT", addonPrice: 350_000, defaultPlans: SALON }),
  defineModule({ id: "referral", name: "معرفی دوستان", description: "لینک اختصاصی و پاداش معرفی", category: "وفاداری", scope: "TENANT", addonPrice: 250_000, defaultPlans: SALON }),

  // ── new revenue
  defineModule({ id: "memberships", name: "پکیج و عضویت", description: "درآمد تکرارشونده با پلن ماهانه", category: "درآمد جدید", scope: "TENANT", addonPrice: 250_000, defaultPlans: SALON }),
  defineModule({ id: "giftcards", name: "کارت هدیه", description: "صدور و خرج کارت هدیه", category: "درآمد جدید", scope: "TENANT", addonPrice: 190_000, defaultPlans: SALON }),
  defineModule({ id: "shop", name: "فروشگاه و پورسانت", description: "فروشگاه اکسیر، لینک معرفی و توصیه‌ی محصول", category: "درآمد جدید", scope: "TENANT", addonPrice: 350_000, defaultPlans: SALON }),

  // ── customer-facing
  defineModule({ id: "portal", name: "پنل و اپ مشتری", description: "ورود مشتری، نوبت‌ها، امتیاز و کیف پول", category: "مشتری", scope: "TENANT", addonPrice: 450_000, defaultPlans: ARTIST }),

  // ── growth
  defineModule({ id: "content", name: "تولید محتوا", description: "کپشن و کارت استوری از عکس‌های قبل/بعد", category: "رشد", scope: "TENANT", addonPrice: 290_000, defaultPlans: ARTIST }),
  defineModule({ id: "marketplace", name: "مارکت‌پلیس متخصص‌ها", description: "پروفایل عمومی و جذب مشتری جدید", category: "رشد", scope: "TENANT", addonPrice: 390_000, defaultPlans: SALON }),
  defineModule({ id: "academy", name: "آکادمی", description: "دوره‌های آموزشی مدیر و متخصص", category: "رشد", scope: "TENANT", addonPrice: 250_000, defaultPlans: SALON }),
  defineModule({ id: "ai", name: "مدیر هوشمند سالن", description: "پرسش و پاسخ روی داده‌های سالن", category: "رشد", scope: "TENANT", addonPrice: 690_000, defaultPlans: [] }),
  defineModule({ id: "network", name: "شبکه خدمات جانبی", description: "بیمه، تجهیزات، استخدام و …", category: "رشد", scope: "TENANT", addonPrice: 190_000, defaultPlans: [] }),
];
