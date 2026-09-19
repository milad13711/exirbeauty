"use client";
import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui";

const qa: Record<string, string> = {
  "چرا فروش این ماه کم شده؟": "فروش خدمات مو ۱۸٪ کاهش داشته. بیشترین کاهش مربوط به مشتریان تکراری بوده: ۳۷ مشتری که معمولاً هر ۴۰ روز مراجعه می‌کردند هنوز نوبت نگرفته‌اند. پیشنهاد: کمپین بازگشت برای این ۳۷ نفر.",
  "فردا چه ظرفیت‌هایی خالی دارم؟": "فردا ۶ نوبت خالی دارید: مریم حسینی ۱۵ تا ۱۷ (۲ نوبت)، الهام رضایی ۱۶ تا ۱۸ (۲ نوبت) و سارا احمدی ۱۷ تا ۱۹ (۲ نوبت). می‌خواهید پیشنهاد لحظه‌ای بفرستم؟",
  "به چه مشتری‌هایی امروز پیام بدهم؟": "۳ مشتری با بیشترین احتمال بازگشت: سارا محمدی (ترمیم رنگ)، نیلوفر صادقی (تمدید کراتین) و الناز جعفری (ژل و لاک). ارزش تقریبی: ۶٫۴ میلیون تومان.",
  "برای این مشتری چه خدمتی پیشنهاد کنم؟": "برای سارا محمدی: ترمیم رنگ ریشه (۴۲ روز گذشته) و در ادامه ماسک ترمیم رنگ. توجه: حساسیت به PPD.",
};
type M = { r: "u" | "a"; t: string };

export default function AI() {
  const [msgs, setMsgs] = useState<M[]>([{ r: "a", t: "سلام! من مدیر هوشمند سالن هستم. درباره‌ی فروش، ظرفیت، مشتریان یا خدمات بپرسید." }]);
  const [v, setV] = useState("");
  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { r: "u", t: q }, { r: "a", t: qa[q] ?? "این سؤال در نسخه‌ی نمونه پاسخ آماده ندارد؛ در نسخه‌ی نهایی از داده‌های واقعی سالن پاسخ می‌دهم." }]);
    setV("");
  };
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">مدیر هوشمند سالن</h1>
      <p className="mb-5 text-sm text-ink2">از داده‌های سالن بپرسید؛ پاسخ همراه با پیشنهاد اقدام است (نسخه‌ی نمایشی)</p>
      <div className="flex h-[560px] flex-col rounded-2xl border border-line bg-surface">
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={m.r === "u" ? "flex justify-start" : "flex items-start gap-2"}>
              {m.r === "a" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose text-white"><Bot size={16} /></span>}
              <p className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-7 ${m.r === "u" ? "bg-plum text-white" : "bg-rosesoft text-ink"}`}>{m.t}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 pt-3">{Object.keys(qa).map((q) => <button key={q} onClick={() => ask(q)} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:bg-surface2">{q}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(v); }} className="flex gap-2 p-4">
          <input value={v} onChange={(e) => setV(e.target.value)} aria-label="سؤال" placeholder="سؤال خود را بنویسید…" className="flex-1 rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-rose" />
          <Button type="submit"><Send size={14} />ارسال</Button>
        </form>
      </div>
    </>
  );
}
