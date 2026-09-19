"use client";
import { useState } from "react";
import clsx from "clsx";
import { Gift, Send } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { fa, toman } from "@/lib/fa";

const occ = ["تولد", "عروسی", "روز مادر", "بدون مناسبت"];
const amounts = [500_000, 1_000_000, 2_000_000, 5_000_000];
const sold = [["کارت ۲ میلیونی", "سارا محمدی ← مادرش", "فعال", "sage"], ["کارت ۱ میلیونی", "پریسا نوری ← نیلوفر", "استفاده‌شده", "neutral"], ["کارت ۵۰۰ هزارتومانی", "مهسا ← دوستش", "ارسال‌شده", "sky"]] as const;

export default function GiftCards() {
  const [o, setO] = useState(occ[0]);
  const [a, setA] = useState(amounts[2]);
  return (
    <>
      <PageTitle title="کارت هدیه" sub="مشتری برای دیگری کارت هدیه می‌خرد و لینکش برای گیرنده ارسال می‌شود" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="خرید کارت هدیه (نمای مشتری)" />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex flex-wrap gap-2">{occ.map((x) => <button key={x} onClick={() => setO(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", o === x ? "border-rose bg-rose text-white" : "border-line text-ink2")}>{x}</button>)}</div>
            <div className="grid grid-cols-2 gap-2">{amounts.map((x) => <button key={x} onClick={() => setA(x)} className={clsx("cursor-pointer rounded-xl border py-2.5 text-sm font-bold", a === x ? "border-rose bg-rosesoft text-rosedeep" : "border-line")}>{toman(x)}</button>)}</div>
            <input aria-label="شماره گیرنده" placeholder="شماره موبایل گیرنده" className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-rose" />
            <Button className="w-full"><Send size={14} />خرید و ارسال لینک</Button>
          </div>
        </Card>
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-plum to-rosedeep p-6 text-white shadow-lg">
            <Gift size={26} className="text-gold" />
            <p className="mt-6 text-xs text-white/60">کارت هدیه سالن رُز · {o}</p>
            <p className="mt-1 text-3xl font-extrabold">{toman(a)}</p>
            <p className="mt-4 text-xs text-white/60">اعتبار تا یک سال · قابل استفاده برای همه‌ی خدمات و فروشگاه</p>
          </div>
          <Card>
            <CardHead title="کارت‌های فروخته‌شده" hint={`${fa(23)} کارت در این ماه`} />
            <ul className="divide-y divide-line">{sold.map((s) => <li key={s[1]} className="flex items-center justify-between px-5 py-3 text-sm"><span><b>{s[0]}</b><span className="block text-xs text-ink3">{s[1]}</span></span><Badge tone={s[2] === "فعال" ? "sage" : s[2] === "ارسال‌شده" ? "sky" : "neutral"}>{s[2]}</Badge></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
