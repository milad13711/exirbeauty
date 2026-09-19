"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls } from "@/components/ui";
import { durationDiscount, plans as seed } from "@/lib/mock4";
import { fa, num, short, toman } from "@/lib/fa";

export default function Plans() {
  const [plans, setPlans] = useState(seed.map((p) => ({ ...p })));
  const [disc, setDisc] = useState(durationDiscount.map((d) => ({ ...d })));
  const [saved, setSaved] = useState(false);
  const touch = () => setSaved(false);
  const mrr = plans.reduce((a, p) => a + p.price * p.subs, 0);

  return (
    <>
      <PageTitle title="تعرفه پلن‌ها" sub={`درآمد ماهانه‌ی فعلی از اشتراک‌ها: ${short(mrr)} تومان`}
        actions={<Button onClick={() => setSaved(true)}>{saved ? "ذخیره شد ✓" : "ذخیره‌ی تعرفه‌ها"}</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p, i) => (
          <Card key={p.id} className={p.hot ? "border-rose ring-1 ring-rose" : ""}>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{p.name}</h2>{p.hot && <Badge tone="rose">محبوب‌ترین</Badge>}</div>
              <Field label="قیمت ماهانه (تومان)">
                <input type="number" min={0} step={10000} value={p.price} onChange={(e) => { setPlans(plans.map((x, j) => (j === i ? { ...x, price: +e.target.value || 0 } : x))); touch(); }} className={fieldCls} />
              </Field>
              <p className="text-sm font-bold text-rosedeep">{toman(p.price)} <span className="text-xs font-normal text-ink3">/ ماه</span></p>
              <ul className="space-y-1.5 text-sm text-ink2">
                <li>تا <b className="text-ink">{fa(p.users)}</b> کاربر · <b className="text-ink">{num(p.customers)}</b> مشتری</li>
                {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Check size={14} className="text-sage" />{f}</li>)}
              </ul>
              <p className="border-t border-line pt-3 text-xs text-ink3">{fa(p.subs)} مشترک فعال · {short(p.price * p.subs)} در ماه</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHead title="تخفیف پرداخت چندماهه" hint="قیمت نهایی هر پلن برای هر مدت، خودکار محاسبه می‌شود" />
        <div className="grid gap-3 px-5 pb-4 sm:grid-cols-4">
          {disc.map((d, i) => (
            <Field key={d.m} label={`${fa(d.m)} ماهه — تخفیف (٪)`}>
              <input type="number" min={0} max={60} disabled={d.m === 1} value={d.off} onChange={(e) => { setDisc(disc.map((x, j) => (j === i ? { ...x, off: Math.min(60, +e.target.value || 0) } : x))); touch(); }} className={`${fieldCls} disabled:bg-surface2`} />
            </Field>
          ))}
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <b className="w-16">{p.name}</b>
              {disc.map((d) => <span key={d.m} className="text-ink2">{fa(d.m)} ماه: <b className="text-ink">{short(p.price * d.m * (1 - d.off / 100))}</b></span>)}
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-xs text-ink3">تغییر قیمت فقط روی تمدیدهای بعدی اعمال می‌شود و اشتراک‌های جاری تغییر نمی‌کنند.</p>
      </Card>
    </>
  );
}
