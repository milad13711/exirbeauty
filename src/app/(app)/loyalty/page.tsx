"use client";
import { useState } from "react";
import { Crown, Gift, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat, tierTone } from "@/components/ui";
import { fa, num } from "@/lib/fa";

const earn = [
  ["مراجعه", 50], ["خرید خدمت (به‌ازای هر ۱۰۰ هزار تومان)", 10], ["خرید محصول (به‌ازای هر ۱۰۰ هزار تومان)", 15],
  ["معرفی دوست (پس از اولین خرید)", 100], ["ثبت نظر", 20], ["تولد", 100], ["مراجعه منظم (سه ماه پیاپی)", 150],
] as const;
const spend = [["تخفیف ۵۰ هزار تومانی", 500], ["ژل ناخن رایگان", 1200], ["ماسک مو", 900], ["فیشال رایگان", 3000], ["ارتقای سطح", 5000]] as const;
const tiers = [
  { n: "برنزی", from: 0, off: 0, perks: "امتیاز پایه" },
  { n: "نقره‌ای", from: 1000, off: 5, perks: "۵٪ تخفیف خدمات" },
  { n: "طلایی", from: 3000, off: 8, perks: "۸٪ تخفیف + اولویت رزرو" },
  { n: "VIP", from: 6000, off: 10, perks: "۱۰٪ تخفیف + هدیه تولد + اولویت" },
];

export default function Loyalty() {
  const [pts, setPts] = useState<number[]>(earn.map((e) => e[1]));
  return (
    <>
      <PageTitle title="باشگاه مشتریان" sub="ساده برای مشتری: فقط «مزایای من در این سالن»" actions={<Button>ذخیره تنظیمات</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعضای باشگاه" value={fa(412)} tone="rose" icon={<Crown size={16} />} />
        <Stat label="امتیاز صادرشده (ماه)" value={num(58400)} tone="gold" icon={<Sparkles size={16} />} />
        <Stat label="امتیاز خرج‌شده" value={num(21900)} tone="sage" icon={<Gift size={16} />} />
        <Stat label="سهم فروش اعضا" value="۷۸٪" tone="sky" />
      </div>

      <Card className="mt-5">
        <CardHead title="سطح‌ها" hint="مشتری با جمع امتیاز، خودکار ارتقا می‌یابد" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div key={t.n} className="rounded-xl border border-line p-4">
              <Badge tone={tierTone[t.n]}><Crown size={11} />{t.n}</Badge>
              <p className="mt-2 text-sm text-ink2">از {num(t.from)} امتیاز</p>
              <p className="mt-1 text-sm font-semibold">{t.perks}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="کسب امتیاز" hint="مقادیر را تغییر دهید" />
          <ul className="divide-y divide-line">
            {earn.map((e, i) => (
              <li key={e[0]} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="flex-1">{e[0]}</span>
                <input aria-label={e[0]} type="number" min={0} value={pts[i]} onChange={(ev) => setPts(pts.map((p, j) => (j === i ? +ev.target.value || 0 : p)))} className="w-20 rounded-lg border border-line px-2 py-1 text-center font-bold" />
                <span className="text-xs text-ink3">امتیاز</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHead title="خرج کردن امتیاز" hint="جایزه‌های قابل دریافت" />
          <ul className="divide-y divide-line">
            {spend.map(([n, c]) => <li key={n} className="flex items-center justify-between px-5 py-3 text-sm"><span>{n}</span><Badge tone="gold">{num(c)} امتیاز</Badge></li>)}
          </ul>
          <div className="m-5 rounded-xl bg-plum p-4 text-white">
            <p className="text-xs text-white/60">پیش‌نمایش برای مشتری</p>
            <p className="mt-1 text-2xl font-extrabold">{num(2450)} امتیاز · VIP</p>
            <p className="text-sm text-white/70">تخفیف من ۱۰٪ · هدیه تولد: یک فیشال · {fa(550)} امتیاز تا جایزه‌ی بعدی</p>
          </div>
        </Card>
      </div>
    </>
  );
}
