"use client";
import { useState } from "react";
import { Gift, Percent, Share2, Sparkles, Wallet } from "lucide-react";
import { Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { fa, short, toman } from "@/lib/fa";

const tx = [
  { t: "کش‌بک خرید ۲ میلیونی", v: 100_000, k: "cashback" },
  { t: "پاداش معرفی پریسا", v: 50_000, k: "referral" },
  { t: "کارت هدیه تولد", v: 200_000, k: "gift" },
  { t: "خرج در فاکتور ۱۰۴۲", v: -100_000, k: "spend" },
] as const;
const ic = { cashback: Percent, referral: Share2, gift: Gift, spend: Wallet };

export default function WalletPage() {
  const [rate, setRate] = useState(5);
  const purchase = 2_000_000;
  return (
    <>
      <PageTitle title="کیف پول و کش‌بک" sub="اعتبار مشتری را برای مراجعه‌ی بعدی نگه می‌دارد؛ جذاب‌تر از تخفیف مستقیم" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعتبار در کیف پول‌ها" value={short(38_200_000)} tone="rose" icon={<Wallet size={16} />} />
        <Stat label="کش‌بک صادرشده" value={short(6_400_000)} tone="gold" />
        <Stat label="نرخ خرج اعتبار" value="۶۴٪" tone="sage" />
        <Stat label="بازگشت با اعتبار" value={fa(58)} sub="مشتری این ماه" tone="sky" icon={<Sparkles size={16} />} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="تنظیم کش‌بک" hint="به‌جای تخفیف دائمی" />
          <div className="space-y-4 px-5 pb-5">
            <label className="flex items-center justify-between text-sm">درصد کش‌بک
              <input type="range" min={1} max={15} value={rate} onChange={(e) => setRate(+e.target.value)} className="mx-3 flex-1 accent-[#b4536f]" /><b className="w-10">{fa(rate)}٪</b>
            </label>
            <div className="rounded-xl bg-goldsoft p-4 text-sm">مشتری {toman(purchase)} خرید می‌کند ← <b>{toman((purchase * rate) / 100)}</b> اعتبار برای خرید بعدی.</div>
          </div>
        </Card>
        <Card>
          <CardHead title="کیف پول سارا محمدی" hint="اعتبار فعلی: ۱۵۰٬۰۰۰ تومان" />
          <ul className="divide-y divide-line">
            {tx.map((x) => { const I = ic[x.k]; return (
              <li key={x.t} className="flex items-center gap-3 px-5 py-3 text-sm"><I size={16} className="text-ink3" /><span className="flex-1">{x.t}</span><b className={x.v < 0 ? "text-danger" : "text-sage"}>{x.v < 0 ? "−" : "+"}{short(Math.abs(x.v))}</b></li>); })}
          </ul>
        </Card>
      </div>
    </>
  );
}
