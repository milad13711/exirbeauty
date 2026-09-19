import type { Post } from "./seed-extra";

export type CapParams = { service?: string; staff?: string; discount?: number; until?: string; name?: string; topic?: string; price?: string; salon: string };
const pick = <T,>(a: T[], v: number) => a[v % a.length];
export const tipTopics: Record<string, string[]> = {
  "مراقبت از رنگ مو": ["۴۸ ساعت اول بعد از رنگ، موها را نشویید.", "از شامپوی بدون سولفات و آب ولرم استفاده کنید.", "هفته‌ای یک‌بار ماسک ترمیم‌کننده رنگ را ماندگار می‌کند."],
  "بعد از کراتین": ["تا ۷۲ ساعت موها را نبندید و خیس نکنید.", "فقط شامپوی بدون سولفات و بدون نمک.", "برای حفظ نتیجه، هر ۴ تا ۶ ماه تمدید کنید."],
  "مراقبت از پوست": ["هر روز ضدآفتاب؛ حتی در روزهای ابری.", "پاکسازی شبانه مهم‌ترین قدم است.", "فیشال ماهانه پوست را شفاف نگه می‌دارد."],
  "نگهداری ژل ناخن": ["از ناخن به‌عنوان ابزار استفاده نکنید.", "هر ۱۰ روز کوتیکول را با روغن نرم کنید.", "برای ماندگاری بیشتر، ژل را حداکثر ۳ هفته نگه دارید."],
};

export function caption(kind: Post["kind"], p: CapParams, variant: number): { text: string; tags: string[] } {
  const svc = p.service ?? "خدمات ما";
  const tag = (s?: string) => (s ? `#${s.replace(/\s+/g, "_")}` : "");
  const base = ["#سالن_زیبایی", tag(p.salon)];
  switch (kind) {
    case "before-after": return { text: pick([`✨ تغییر رنگ، تغییر حال! نتیجه‌ی ${svc} با دست ${p.staff ?? "متخصص ما"} 💛 برای رزرو نوبت، لینک را لمس کنید.`, `قبل و بعد ${svc} 😍 هر تغییر، یک قصه‌ی تازه. نوبتتان را همین حالا رزرو کنید.`, `نتیجه‌ی واقعی، بدون فیلتر ✨ ${svc} در ${p.salon}. منتظر شما هستیم!`], variant), tags: [tag(svc), "#قبل_و_بعد", ...base] };
    case "service": return { text: pick([`🌸 ${svc} در ${p.salon}${p.price ? ` — از ${p.price} تومان` : ""}. با متخصص‌های ما، نتیجه‌ای که دوست دارید.`, `دنبال ${svc} حرفه‌ای می‌گردید؟ ${p.salon} با تخصص ${p.staff ?? "تیم ما"} در خدمت شماست.`, `${svc}؛ یک لحظه از خودتان مراقبت کنید 💗 برای نوبت‌گیری، لینک پروفایل.`], variant), tags: [tag(svc), ...base] };
    case "offer": return { text: pick([`🎁 پیشنهاد ویژه: ${p.discount ?? 10}٪ تخفیف روی ${svc}${p.until ? ` تا ${p.until}` : ""}. ظرفیت محدود است؛ همین حالا رزرو کنید!`, `فرصت ویژه ⏰ ${svc} با ${p.discount ?? 10}٪ تخفیف${p.until ? ` (تا ${p.until})` : ""}. برای رزرو، لینک را لمس کنید.`, `این هفته ${p.discount ?? 10}٪ تخفیف ${svc} فقط برای شما 💝${p.until ? ` تا ${p.until}` : ""}`], variant), tags: ["#تخفیف", tag(svc), ...base] };
    case "birthday": return { text: pick([`🎂 تولد مشتریان عزیز این ماه مبارک! ${p.salon} یک هدیه‌ی ویژه برایتان دارد؛ کافی است بگویید «تولدمه».`, `به مناسبت تولد عزیزانی که در ماه ${p.topic ?? "جاری"} به دنیا آمده‌اند 🎈 هدیه‌ی ما یک فیشال رایگان است.`], variant), tags: ["#تولدت_مبارک", ...base] };
    case "tips": { const t = tipTopics[p.topic ?? ""] ?? tipTopics["مراقبت از پوست"]; return { text: `💡 ${p.topic ?? "نکته‌ی زیبایی"}:\n${t.map((x, i) => `${i + 1}. ${x}`).join("\n")}\nسؤالی دارید؟ در دایرکت بپرسید.`, tags: ["#نکته_زیبایی", ...base] }; }
  }
}
