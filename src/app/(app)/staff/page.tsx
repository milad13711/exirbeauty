"use client";
import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Award, ExternalLink, Heart, Link2, Star, TrendingUp, Trophy } from "lucide-react";
import { Avatar, Badge, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { staff } from "@/lib/mock";
import { fa, short } from "@/lib/fa";

const boards = [
  { t: "پرفروش‌ترین متخصص ماه", who: "مریم حسینی", icon: Trophy, tone: "gold" as const },
  { t: "بیشترین مشتری وفادار", who: "الهام رضایی", icon: Heart, tone: "rose" as const },
  { t: "بیشترین فروش محصول", who: "الهام رضایی", icon: TrendingUp, tone: "sage" as const },
  { t: "بالاترین رضایت مشتری", who: "مریم حسینی", icon: Star, tone: "amber" as const },
];

export default function Staff() {
  const [id, setId] = useState("s1");
  const s = staff.find((x) => x.id === id)!;
  const newC = Math.round(s.clients * (100 - s.returning) / 100);
  return (
    <>
      <PageTitle title="پرسنل و متخصص‌ها" sub="چه کسی چقدر برای سالن درآمد ساخته است؟" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {boards.map((b) => { const I = b.icon; return (
          <Card key={b.t} className="flex items-center gap-3 p-4"><Badge tone={b.tone} className="size-10 justify-center !rounded-xl !p-0"><I size={18} /></Badge><div><p className="text-[11px] text-ink3">{b.t}</p><p className="text-sm font-bold">{b.who}</p></div></Card>
        ); })}
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <ul className="space-y-2">
          {staff.map((p) => (
            <li key={p.id}>
              <button onClick={() => setId(p.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-3 text-right", id === p.id ? "border-rose ring-1 ring-rose" : "border-line hover:bg-surface2")}>
                <Avatar name={p.name} color={p.color} size={42} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name}</p><p className="truncate text-[11px] text-ink3">{p.role}</p></div>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-gold"><Star size={12} fill="currentColor" />{fa(p.rating)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="درآمد ماه" value={short(s.revenue)} tone="rose" icon={<Award size={16} />} />
            <Stat label="کمیسیون" value={short(s.commission)} tone="gold" />
            <Stat label="فروش محصول" value={short(s.products)} tone="sage" />
            <Stat label="میانگین فاکتور" value={short(s.avgInvoice)} tone="sky" />
            <Stat label="تعداد مشتری" value={fa(s.clients)} />
            <Stat label="مشتری جدید" value={fa(newC)} sub="این ماه" tone="sage" />
            <Stat label="نرخ بازگشت" value={`${fa(s.returning)}٪`} tone="rose" />
            <Stat label="رضایت مشتری" value={`${fa(s.rating)} از ۵`} tone="amber" />
          </div>
          <Card>
            <CardHead title="لینک رزرو آنلاین" hint="مشتری با این لینک‌ها مستقیم نوبت می‌گیرد" action={<Link2 size={16} className="text-ink3" />} />
            <ul className="divide-y divide-line">
              {[{ l: `رزرو از ${s.name}`, h: `/book?staff=${s.id}` }, { l: "رزرو از سالن (هر متخصص)", h: "/book" }].map((x) => (
                <li key={x.h} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-40"><b className="block">{x.l}</b><bdi dir="ltr" className="text-xs text-ink3">exirbeauty.ir{x.h}</bdi></span>
                  <Link href={x.h} className="inline-flex items-center gap-1 text-[13px] font-semibold text-rose hover:text-rosedeep"><ExternalLink size={13} />باز کردن فرم</Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHead title="ساعات کاری و ظرفیت" hint="اشغال‌شدن ظرفیت این ماه" />
            <div className="px-5 pb-5">
              <div className="mb-1.5 flex justify-between text-sm"><span>ظرفیت پُر: <b>{fa(s.fill)}٪</b></span><span className="text-ink3">ظرفیت خالی: {fa(100 - s.fill)}٪</span></div>
              <div className="h-3 rounded-full bg-surface2"><div className="h-3 rounded-full" style={{ width: `${s.fill}%`, background: s.color }} /></div>
              <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px]">
                {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d, i) => { const off = i === 6 || (s.id === "s4" && i === 3); return (
                  <div key={d} className={clsx("rounded-lg py-2", off ? "bg-surface2 text-ink3" : "bg-rosesoft text-rosedeep")}><b>{d}</b><br />{off ? "تعطیل" : "۹ تا ۱۹"}</div>
                ); })}
              </div>
              <p className="mt-3 text-xs text-ink3">مرخصی‌ها و ساعات استراحت از همین‌جا تنظیم می‌شود و در تقویم اعمال می‌شود.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
