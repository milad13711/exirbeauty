"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { CRM_PLAN, ordersSeed, salons } from "@/lib/mock3";
import { useDB } from "@/lib/db";
import { commTone } from "@/lib/tones";
import { fa, short, toman } from "@/lib/fa";

const me = salons[0]; // سالن رُز
const mine = ordersSeed.filter((o) => o.salon === me.id);

export default function ReferralStore() {
  const db = useDB();
  const [copied, setCopied] = useState(false);
  const link = `exirbeauty.ir/store?ref=${me.code}`;
  const cov = Math.min(100, Math.round((me.wallet / CRM_PLAN.price) * 100));
  const copy = () => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <>
      <PageTitle title="فروشگاه اکسیر و درآمد معرفی" sub="محصولات را به مشتریانتان معرفی کنید؛ از هر خرید پورسانت می‌گیرید و اشتراک را با آن پرداخت می‌کنید"
        actions={<Link href="/store" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2"><ExternalLink size={14} />دیدن فروشگاه</Link>} />

      <Card className="overflow-hidden">
        <div className="bg-plum p-5 text-white md:p-6">
          <p className="text-xs text-white/60">لینک اختصاصی سالن شما</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <bdi dir="ltr" className="min-w-0 flex-1 basis-56 truncate rounded-xl bg-white/10 px-3 py-2.5 text-sm">{link}</bdi>
            <Button variant="soft" onClick={copy}>{copied ? <><Check size={14} />کپی شد</> : <><Copy size={14} />کپی لینک</>}</Button>
          </div>
          <p className="mt-3 text-xs text-white/60">هر خریدی که از این لینک انجام شود به نام سالن شما ثبت می‌شود؛ حتی اگر مشتری بعداً دوباره برگردد.</p>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="کیف پول سالن" value={short(me.wallet)} sub="قابل استفاده برای اشتراک" tone="sage" icon={<Wallet size={16} />} />
        <Stat label="پورسانت در انتظار" value={short(me.pending)} sub={`تا ${fa(7)} روز پس از تحویل`} tone="amber" />
        <Stat label="سفارش‌های معرفی‌شده" value={fa(me.orders)} tone="sky" />
        <Stat label="فروش ایجادشده" value={short(me.sales)} tone="rose" />
      </div>

      <Card className="mt-5">
        <CardHead title="اشتراک با کیف پول" hint={`سررسید ${CRM_PLAN.renewal} · ${toman(CRM_PLAN.price)}`} />
        <div className="px-5 pb-5">
          <div className="mb-1.5 flex justify-between text-sm"><span>کیف پول پوشش می‌دهد: <b>{fa(cov)}٪</b></span><span className="text-ink3">مانده: {toman(Math.max(0, CRM_PLAN.price - me.wallet))}</span></div>
          <div className="h-3 rounded-full bg-surface2"><div className="h-3 rounded-full bg-sage" style={{ width: `${cov}%` }} /></div>
          <p className="mt-3 text-xs leading-6 text-ink2">در سررسید، ابتدا از کیف پول کسر می‌شود و اگر کم بود فقط مابقی را آنلاین می‌پردازید. با معرفی بیشتر، اشتراک تقریباً رایگان می‌شود.</p>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="پورسانت هر محصول" hint="پیشنهاد به مشتری در صفحه‌ی پروفایل او" />
          <ul className="divide-y divide-line">
            {db.products.filter((p) => p.active).slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate">{p.name}</span><Badge tone="gold">{fa(p.commission)}٪</Badge><b className="w-20 text-left">{short(p.price * p.commission / 100)}</b></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHead title="سفارش‌های معرفی‌شده‌ی شما" />
          <DataList rows={mine} id={(o) => o.id} cols={[
            { h: "سفارش", title: true, cell: (o) => <>{o.customer} <span className="text-xs font-normal text-ink3">· {o.date}</span></> },
            { h: "اقلام", cell: (o) => o.items },
            { h: "پورسانت", cell: (o) => <b>{toman(o.comm)}</b> },
            { h: "وضعیت", cell: (o) => <Badge tone={commTone[o.cs]}>{o.cs}</Badge> },
          ]} />
        </Card>
      </div>
    </>
  );
}
