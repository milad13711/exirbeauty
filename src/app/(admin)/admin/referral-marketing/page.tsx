"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { boosts as seedBoosts, kit, refPrograms } from "@/lib/mock4";
import { RETURN_DAYS, salons } from "@/lib/mock3";
import { fa, short } from "@/lib/fa";

export default function ReferralMarketing() {
  const [programs, setPrograms] = useState(refPrograms);
  const [boosts, setBoosts] = useState(seedBoosts);
  const [days, setDays] = useState(RETURN_DAYS);
  const [minPay, setMinPay] = useState(100_000);
  const [saved, setSaved] = useState(false);
  const top = [...salons].sort((a, b) => b.sales - a.sales);

  return (
    <>
      <PageTitle title="ریفرال مارکتینگ" sub="برنامه‌های معرفی، پورسانت ویژه و ابزار تبلیغ برای سالن‌ها" actions={<Button onClick={() => setSaved(true)}>{saved ? "ذخیره شد ✓" : "ذخیره‌ی تنظیمات"}</Button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="برنامه‌های معرفی" />
          <ul className="divide-y divide-line">
            {programs.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0 flex-1"><p className="text-sm font-bold">{p.name}</p><p className="mt-0.5 text-xs leading-6 text-ink2">{p.desc}</p><Badge tone="gold" className="mt-1.5">{p.value}</Badge></div>
                <Toggle on={p.on} label={`فعال بودن ${p.name}`} onChange={(v) => { setPrograms(programs.map((x) => (x.id === p.id ? { ...x, on: v } : x))); setSaved(false); }} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHead title="قوانین عمومی پورسانت" />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="مهلت مرجوعی تا آزادسازی (روز)"><input type="number" min={0} value={days} onChange={(e) => { setDays(+e.target.value || 0); setSaved(false); }} className={fieldCls} /></Field>
            <Field label="حداقل مبلغ شارژ کیف پول (تومان)"><input type="number" min={0} step={10000} value={minPay} onChange={(e) => { setMinPay(+e.target.value || 0); setSaved(false); }} className={fieldCls} /></Field>
            <p className="text-xs leading-6 text-ink2 sm:col-span-2">پورسانت {fa(days)} روز پس از تحویل سفارش قابل شارژ می‌شود. مبلغ‌های کمتر از {short(minPay)} تومان به دوره‌ی بعد منتقل می‌شوند.</p>
          </div>
        </Card>

        <Card>
          <CardHead title="پورسانت ویژه (کمپین)" hint="افزایش موقت پورسانت برای تشویق سالن‌ها" />
          <ul className="divide-y divide-line">
            {boosts.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{b.name}</p><p className="text-xs text-ink3">{b.range} · {b.scope}</p></div><Toggle on={b.on} label={`فعال بودن ${b.name}`} onChange={(v) => { setBoosts(boosts.map((x) => (x.id === b.id ? { ...x, on: v } : x))); setSaved(false); }} /></li>
            ))}
          </ul>
          <div className="px-5 py-3"><Button variant="ghost">+ کمپین جدید</Button></div>
        </Card>
        <Card>
          <CardHead title="ابزار تبلیغ برای سالن‌ها" hint="در پنل سالن قابل دانلود است" />
          <ul className="divide-y divide-line">
            {kit.map((k) => <li key={k} className="flex items-center justify-between px-5 py-3 text-sm">{k}<Button variant="ghost"><Download size={13} />فایل</Button></li>)}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHead title="برترین معرف‌ها" />
          <ul className="divide-y divide-line">
            {top.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"><span className="w-4 text-xs font-bold text-ink3">{fa(i + 1)}</span><Avatar name={s.name} size={32} /><div className="min-w-0 flex-1 basis-32"><p className="text-sm font-bold">{s.name}</p><p className="text-xs text-ink3">{fa(s.orders)} سفارش</p></div><b className="text-sm">{short(s.sales)}</b></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
