"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Download, FileSpreadsheet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat } from "@/components/ui";
import { useDB } from "@/lib/db";
import { summarize } from "@/lib/sales";
import { exportCsv, exportXlsx } from "@/lib/export";
import { dayInfo } from "@/lib/dates";
import { fa, short, toman } from "@/lib/fa";

const ranges = [{ k: "today", l: "امروز", from: 0 }, { k: "7", l: "۷ روز", from: -6 }, { k: "30", l: "۳۰ روز", from: -29 }] as const;
const tabs = ["خلاصه", "خدمات", "متخصص‌ها", "مشتریان", "پرداخت‌ها"] as const;

function Bar({ v, max, label }: { v: number; max: number; label: string }) {
  return <div className="h-2 rounded-full bg-surface2" role="img" aria-label={label}><div className="h-2 rounded-full bg-rose" style={{ width: `${max ? Math.max(3, (v / max) * 100) : 0}%` }} /></div>;
}

export function ReportsApp() {
  const db = useDB();
  const [rk, setRk] = useState<(typeof ranges)[number]["k"]>("30");
  const [tab, setTab] = useState<(typeof tabs)[number]>("خلاصه");
  const from = ranges.find((r) => r.k === rk)!.from;
  const sm = useMemo(() => summarize(db, from, 0), [db, from]);

  const data = useMemo(() => {
    const byDay = new Map<number, number>();
    const bySvc = new Map<string, { n: number; rev: number }>();
    const byStaff = new Map<string, { rev: number; com: number; n: number }>();
    const byCust = new Map<string, { name: string; rev: number; n: number }>();
    const prod = new Map<string, { q: number; rev: number }>();
    for (const s of sm.sales) {
      byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.total);
      const f = 1 - s.discountPct / 100;
      for (const l of s.lines) {
        const net = l.price * l.qty * f;
        if (l.kind === "product") { const p = prod.get(l.name) ?? { q: 0, rev: 0 }; prod.set(l.name, { q: p.q + l.qty, rev: p.rev + net }); continue; }
        const e = bySvc.get(l.name) ?? { n: 0, rev: 0 }; bySvc.set(l.name, { n: e.n + l.qty, rev: e.rev + net });
        if (l.staffId) { const t = byStaff.get(l.staffId) ?? { rev: 0, com: 0, n: 0 }; byStaff.set(l.staffId, { rev: t.rev + net, com: t.com + (net * (l.commissionPct ?? 0)) / 100, n: t.n + l.qty }); }
      }
      if (s.customerId) { const c = byCust.get(s.customerId) ?? { name: s.customerName, rev: 0, n: 0 }; byCust.set(s.customerId, { ...c, rev: c.rev + s.total, n: c.n + 1 }); }
    }
    const firstDay = new Map<string, number>();
    for (const s of db.sales) if (s.status !== "باطل" && s.customerId) firstDay.set(s.customerId, Math.min(firstDay.get(s.customerId) ?? 0, s.day));
    // «جدید»: اولین فاکتور در بازه است و مشتری قبل‌تر سابقه‌ی مراجعه‌ی ثبت‌شده‌ای در CRM ندارد
    const nSales = new Map<string, number>();
    for (const s of db.sales) if (s.status !== "باطل" && s.customerId) nSales.set(s.customerId, (nSales.get(s.customerId) ?? 0) + 1);
    const newC = [...byCust.keys()].filter((id) => (firstDay.get(id) ?? 0) >= from && (db.customers.find((c) => c.id === id)?.visits ?? 0) <= (nSales.get(id) ?? 0)).length;
    const days = Array.from({ length: -from + 1 }, (_, i) => from + i);
    return { byDay, days, svc: [...bySvc].sort((a, b) => b[1].rev - a[1].rev), staff: [...byStaff].sort((a, b) => b[1].rev - a[1].rev), cust: [...byCust].sort((a, b) => b[1].rev - a[1].rev), prod: [...prod].sort((a, b) => b[1].rev - a[1].rev), newC, retC: byCust.size - newC };
  }, [sm, db.sales, db.customers, from]);

  const maxDay = Math.max(0, ...data.days.map((d) => data.byDay.get(d) ?? 0));
  const staffName = (id: string) => db.staff.find((s) => s.id === id)?.name ?? id;
  const avg = sm.count ? Math.round(sm.revenue / sm.count) : 0;
  const rangeLabel = from === 0 ? dayInfo(0).full : `${dayInfo(from).short} تا ${dayInfo(0).short}`;

  const exportAll = () => exportXlsx(`گزارش-${rk === "today" ? "امروز" : rk + "-روز"}`, [
    { name: "خلاصه", head: ["شاخص", "مقدار (تومان)"], widths: [26, 18], rows: [["بازه", rangeLabel], ["فروش خالص", sm.revenue], ["تعداد فاکتور", sm.count], ["میانگین فاکتور", avg], ["فروش خدمات", sm.services], ["فروش محصول", sm.products], ["تخفیف‌ها", sm.discounts], ["نقدی", sm.cash], ["کارت", sm.card], ["آنلاین", sm.online], ["کیف پول", sm.wallet], ["کارت هدیه", sm.gift], ["بدهی جدید", sm.newDebt], ["هزینه‌ها", sm.expenses], ["پورسانت متخصص‌ها", sm.commission], ["سود (فروش − هزینه)", sm.net]] },
    { name: "فاکتورها", head: ["شماره", "روز", "ساعت", "مشتری", "اقلام", "جمع", "تخفیف", "قابل پرداخت", "پرداخت", "بدهی"], widths: [12, 16, 8, 20, 36, 14, 12, 14, 30, 12], rows: sm.sales.map((s) => [s.id, dayInfo(s.day).short, s.time, s.customerName, s.lines.map((l) => `${l.name}×${l.qty}`).join("، "), s.subtotal, s.discount, s.total, s.pays.map((p) => `${p.method} ${p.amount}`).join(" + "), s.debt]) },
    { name: "خدمات", head: ["خدمت", "تعداد", "فروش"], widths: [24, 10, 16], rows: data.svc.map(([n, v]) => [n, v.n, Math.round(v.rev)]) },
    { name: "متخصص‌ها", head: ["متخصص", "خدمات", "فروش", "پورسانت"], widths: [22, 10, 16, 16], rows: data.staff.map(([id, v]) => [staffName(id), v.n, Math.round(v.rev), Math.round(v.com)]) },
    { name: "مشتریان", head: ["مشتری", "تعداد فاکتور", "مجموع خرید"], widths: [24, 14, 16], rows: data.cust.map(([, v]) => [v.name, v.n, v.rev]) },
    { name: "هزینه‌ها", head: ["روز", "عنوان", "دسته", "پرداخت از", "مبلغ"], widths: [16, 26, 16, 12, 14], rows: db.expenses.filter((e) => e.day >= from).map((e) => [dayInfo(e.day).short, e.title, e.cat, e.method, e.amount]) },
  ]);
  const exportCsvBtn = () => exportCsv("فاکتورها", ["شماره", "روز", "مشتری", "جمع", "تخفیف", "قابل پرداخت", "بدهی"], sm.sales.map((s) => [s.id, dayInfo(s.day).short, s.customerName, s.subtotal, s.discount, s.total, s.debt]));

  return (
    <>
      <PageTitle title="گزارش‌ها" sub={rangeLabel} actions={<><Button variant="ghost" onClick={exportCsvBtn}><Download size={14} />CSV فاکتورها</Button><Button onClick={exportAll}><FileSpreadsheet size={14} />خروجی Excel کامل</Button></>} />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="بازه‌ی زمانی">
        {ranges.map((r) => <button key={r.k} aria-pressed={rk === r.k} onClick={() => setRk(r.k)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", rk === r.k ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{r.l}</button>)}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("press min-h-10 cursor-pointer rounded-full border px-4 py-2 text-[13px] font-bold", tab === t ? "border-plum bg-plum text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{t}</button>)}
      </div>

      {tab === "خلاصه" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="فروش خالص" value={short(sm.revenue)} tone="rose" />
            <Stat label="تعداد فاکتور" value={fa(sm.count)} sub={`میانگین ${short(avg)}`} tone="sky" />
            <Stat label="هزینه‌ها" value={short(sm.expenses)} tone="amber" />
            <Stat label="سود (فروش − هزینه)" value={short(sm.net)} tone="sage" />
            <Stat label="فروش خدمات" value={short(sm.services)} tone="gold" />
            <Stat label="فروش محصول" value={short(sm.products)} sub={sm.revenue ? `${fa(Math.round((sm.products / (sm.services + sm.products || 1)) * 100))}٪ از فروش` : ""} tone="sage" />
            <Stat label="تخفیف‌ها" value={short(sm.discounts)} tone="amber" />
            <Stat label="بدهی جدید" value={short(sm.newDebt)} tone="danger" />
          </div>
          <Card className="mt-5">
            <CardHead title="فروش روزانه" hint="میلیون تومان" />
            <div className="flex h-44 items-end gap-[3px] px-4 pb-2" role="img" aria-label="نمودار فروش روزانه">
              {data.days.map((d) => { const v = data.byDay.get(d) ?? 0; return <div key={d} className="flex min-w-0 flex-1 flex-col items-center justify-end" title={`${dayInfo(d).short}: ${toman(v)}`}><div className={clsx("w-full rounded-t", d === 0 ? "bg-rose" : "bg-rosesoft")} style={{ height: `${maxDay ? Math.max(2, (v / maxDay) * 100) : 2}%` }} /></div>; })}
            </div>
            <div className="flex justify-between px-4 pb-4 text-[11px] text-ink3"><span>{dayInfo(from).short}</span><span>امروز</span></div>
          </Card>
        </>
      )}

      {tab === "خدمات" && (
        <Card><CardHead title="فروش به تفکیک خدمت" /><ul className="divide-y divide-line">
          {data.svc.map(([n, v]) => <li key={n} className="space-y-1.5 px-5 py-3"><div className="flex justify-between text-sm"><b>{n}</b><span>{short(v.rev)} · {fa(v.n)} بار</span></div><Bar v={v.rev} max={data.svc[0]?.[1].rev ?? 0} label={n} /></li>)}
          {!data.svc.length && <li className="px-5 py-8 text-center text-sm text-ink3">داده‌ای در این بازه نیست.</li>}
        </ul>
        {data.prod.length > 0 && <div className="border-t border-line px-5 py-3"><p className="mb-2 text-xs font-bold text-ink2">فروش محصول</p>{data.prod.map(([n, v]) => <p key={n} className="flex justify-between py-1 text-sm"><span>{n}</span><span>{fa(v.q)} عدد · {short(v.rev)}</span></p>)}</div>}</Card>
      )}

      {tab === "متخصص‌ها" && (
        <Card><CardHead title="عملکرد متخصص‌ها" hint="درآمد ساخته‌شده و پورسانت" /><ul className="divide-y divide-line">
          {data.staff.map(([id, v]) => <li key={id} className="space-y-1.5 px-5 py-3"><div className="flex flex-wrap justify-between gap-x-3 text-sm"><b>{staffName(id)}</b><span>{short(v.rev)} <span className="text-ink3">· پورسانت {short(v.com)} · {fa(v.n)} خدمت</span></span></div><Bar v={v.rev} max={data.staff[0]?.[1].rev ?? 0} label={staffName(id)} /></li>)}
          {!data.staff.length && <li className="px-5 py-8 text-center text-sm text-ink3">داده‌ای در این بازه نیست.</li>}
        </ul></Card>
      )}

      {tab === "مشتریان" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3"><Stat label="مشتری جدید" value={fa(data.newC)} tone="sage" /><Stat label="مشتری برگشتی" value={fa(data.retC)} tone="rose" /></div>
          <Card><CardHead title="بهترین مشتریان" /><ul className="divide-y divide-line">{data.cust.slice(0, 10).map(([id, v], i) => <li key={id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="w-5 text-xs font-bold text-ink3">{fa(i + 1)}</span><b className="min-w-0 flex-1 truncate">{v.name}</b><span className="text-ink3">{fa(v.n)} فاکتور</span><b>{short(v.rev)}</b></li>)}{!data.cust.length && <li className="px-5 py-8 text-center text-sm text-ink3">داده‌ای در این بازه نیست.</li>}</ul></Card>
        </div>
      )}

      {tab === "پرداخت‌ها" && (
        <Card><CardHead title="روش‌های پرداخت" /><ul className="divide-y divide-line">
          {([["نقدی", sm.cash], ["کارت", sm.card], ["آنلاین", sm.online], ["کیف پول", sm.wallet], ["کارت هدیه", sm.gift]] as const).map(([n, v]) => <li key={n} className="space-y-1.5 px-5 py-3"><div className="flex justify-between text-sm"><b>{n}</b><span>{short(v)}</span></div><Bar v={v} max={Math.max(sm.cash, sm.card, sm.online, sm.wallet, sm.gift)} label={n} /></li>)}
          <li className="flex justify-between px-5 py-3 text-sm"><b>بدهی پرداخت‌نشده</b><Badge tone="danger">{short(sm.newDebt)}</Badge></li>
        </ul></Card>
      )}
    </>
  );
}
