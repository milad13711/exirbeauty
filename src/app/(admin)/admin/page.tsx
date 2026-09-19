"use client";
import Link from "next/link";
import { ArrowLeft, Coins, Receipt, ShoppingBag, Users } from "lucide-react";
import { Badge, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { CRM_PLAN, salons } from "@/lib/mock3";
import { useDB } from "@/lib/db";
import { fa, short } from "@/lib/fa";

export default function AdminHome() {
  const db = useDB();
  const ready = db.orders.filter((o) => o.cs === "آماده شارژ");
  const readySum = ready.reduce((a, o) => a + o.comm, 0);
  const ranked = [...salons].sort((a, b) => b.sales - a.sales);
  return (
    <>
      <PageTitle title="نمای کلی فروشگاه" sub="فروش محصولات از طریق سالن‌های معرف و پورسانت آن‌ها" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="فروش ماه" value={short(134_600_000)} tone="rose" icon={<ShoppingBag size={16} />} />
        <Stat label="سفارش‌های ماه" value={fa(118)} tone="sky" icon={<Receipt size={16} />} />
        <Stat label="سهم فروش از معرف‌ها" value="۸۶٪" tone="gold" />
        <Stat label="سالن‌های فعال معرف" value={fa(salons.length)} tone="sage" icon={<Users size={16} />} />
      </div>
      <Link href="/admin/commissions" className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber/30 bg-ambersoft px-5 py-4">
        <Coins className="text-amber" />
        <p className="min-w-0 flex-1 basis-56 text-sm"><b>{fa(ready.length)} سفارش</b> مهلت مرجوعی را گذرانده و پورسانتشان ({short(readySum)} تومان) آماده‌ی شارژ کیف پول سالن‌هاست.</p>
        <span className="inline-flex items-center gap-1 text-sm font-bold text-amber">بررسی و شارژ <ArrowLeft size={14} /></span>
      </Link>
      <Card className="mt-5">
        <CardHead title="برترین سالن‌های معرف" hint={`اشتراک ماهانه‌ی هر سالن ${short(CRM_PLAN.price)} تومان است`} />
        <ul className="divide-y divide-line">
          {ranked.map((s, i) => {
            const cov = Math.min(100, Math.round(((db.wallets[s.id] ?? 0) / CRM_PLAN.price) * 100));
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <span className="w-4 text-xs font-bold text-ink3">{fa(i + 1)}</span>
                <div className="min-w-0 flex-1 basis-40"><p className="text-sm font-bold">{s.name}</p><p className="text-xs text-ink3">{s.city} · {fa(s.orders)} سفارش</p></div>
                <b className="text-sm">{short(s.sales)}</b>
                <Badge tone={cov >= 100 ? "sage" : "amber"}>پوشش اشتراک {fa(cov)}٪</Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
