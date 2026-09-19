"use client";
import { useState } from "react";
import clsx from "clsx";
import { Cake, Clock, Gift, Repeat, ShoppingBag, UserX } from "lucide-react";
import { Badge, Card, PageTitle } from "@/components/ui";
import { fa } from "@/lib/fa";

const initial = [
  { id: 1, icon: Clock, t: "مراجعه نکرده", when: "۴۵ روز بعد از آخرین مراجعه", do: "ارسال یادآوری نوبت", sent: 64, back: 19, on: true },
  { id: 2, icon: Repeat, t: "زمان سرویس بعدی", when: "چند روز مانده به چرخه‌ی معمول مشتری", do: "یادآوری «وقت ترمیم رنگ شماست»", sent: 92, back: 41, on: true },
  { id: 3, icon: ShoppingBag, t: "پس از خرید", when: "۲۴ ساعت بعد از خرید", do: "پیشنهاد محصول مکمل", sent: 48, back: 11, on: true },
  { id: 4, icon: Cake, t: "تولد", when: "روز تولد", do: "ارسال هدیه (فیشال یا امتیاز)", sent: 17, back: 9, on: true },
  { id: 5, icon: UserX, t: "غیبت طولانی", when: "۹۰ روز بدون مراجعه", do: "کمپین Win-back با ۱۵٪ تخفیف", sent: 23, back: 5, on: false },
];

export default function Automation() {
  const [rules, setRules] = useState(initial);
  const gain = rules.filter((r) => r.on).reduce((a, r) => a + r.back, 0);
  return (
    <>
      <PageTitle title="اتوماسیون بازگشت مشتری" sub="سیستم رفتار مشتری را می‌سنجد؛ مدیر سالن لازم نیست دستی پیگیری کند" />
      <Card className="mb-5 flex items-center gap-3 bg-sagesoft px-5 py-4"><Gift className="text-sage" /><p className="text-sm">این ماه اتوماسیون‌ها <b>{fa(gain)} مشتری</b> را به سالن برگردانده‌اند.</p></Card>
      <div className="space-y-3">
        {rules.map((r) => { const I = r.icon; return (
          <Card key={r.id} className={clsx("flex flex-wrap items-center gap-4 p-4", !r.on && "opacity-60")}>
            <span className="grid size-11 place-items-center rounded-xl bg-rosesoft text-rose"><I size={20} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{r.t}</p>
              <p className="mt-0.5 text-sm text-ink2"><Badge>اگر</Badge> {r.when} <Badge tone="rose">آن‌گاه</Badge> {r.do}</p>
            </div>
            <div className="text-center text-xs text-ink3"><b className="block text-base text-ink">{fa(r.sent)}</b>ارسال</div>
            <div className="text-center text-xs text-ink3"><b className="block text-base text-sage">{fa(r.back)}</b>بازگشت</div>
            <button role="switch" aria-checked={r.on} aria-label={`فعال‌سازی ${r.t}`} onClick={() => setRules(rules.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))} className={clsx("relative h-6 w-11 cursor-pointer rounded-full transition-colors", r.on ? "bg-rose" : "bg-line")}>
              <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white transition-all", r.on ? "right-0.5" : "right-[22px]")} />
            </button>
          </Card>); })}
      </div>
    </>
  );
}
