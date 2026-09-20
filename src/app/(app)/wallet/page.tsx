"use client";
import { useState } from "react";
import { Check, Gift, Percent, Share2, Sparkles, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { growth } from "@/lib/growth";
import { useDB } from "@/lib/db";
import type { Cashback } from "@/lib/seed-extra";
import { fa, short, toman } from "@/lib/fa";

const OFF: Cashback = { on: false, pct: 3, minSpend: 500_000, maxPerSale: 300_000 };
const kindIcon = (n: string) => (n.includes("کش‌بک") ? Percent : n.includes("معرفی") ? Share2 : n.includes("هدیه") || n.includes("جایزه") ? Gift : Wallet);

export default function WalletPage() {
  const db = useDB();
  const [cb, setCb] = useState<Cashback>(db.loyalty.cashback ?? OFF);
  const [saved, setSaved] = useState(false);
  const [adj, setAdj] = useState<{ id: string; delta: string; note: string } | null>(null);
  const [sim, setSim] = useState(2_000_000);

  const holders = db.customers.filter((c) => c.wallet > 0).sort((a, b) => b.wallet - a.wallet);
  const total = holders.reduce((a, c) => a + c.wallet, 0);
  const issued = db.sales.reduce((a, s) => a + (s.status === "باطل" ? 0 : s.cashback ?? 0), 0);
  const spent = db.sales.reduce((a, s) => a + (s.status === "باطل" ? 0 : s.walletUsed), 0);
  const rate = issued + spent ? Math.round((spent / (issued + spent + total)) * 100) : 0;
  const recent = db.customers.flatMap((c) => c.walletLog.slice(0, 4).map((l) => ({ ...l, name: c.name }))).slice(0, 10);
  const simCb = sim >= cb.minSpend ? Math.min(cb.maxPerSale, Math.round((sim * cb.pct) / 100 / 1000) * 1000) : 0;
  const dirty = JSON.stringify(cb) !== JSON.stringify(db.loyalty.cashback ?? OFF);

  return (
    <>
      <PageTitle title="کیف پول و کش‌بک" sub="اعتبار مشتری را برای مراجعه‌ی بعدی نگه می‌دارد؛ جذاب‌تر از تخفیف مستقیم" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="اعتبار در کیف پول‌ها" value={short(total)} sub={`${fa(holders.length)} مشتری`} tone="rose" icon={<Wallet size={16} />} />
        <Stat label="کش‌بک صادرشده" value={short(issued)} tone="gold" icon={<Percent size={16} />} />
        <Stat label="خرج‌شده از کیف پول" value={short(spent)} tone="sage" />
        <Stat label="نرخ خرج اعتبار" value={`${fa(rate)}٪`} tone="sky" icon={<Sparkles size={16} />} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHead title="تنظیم کش‌بک خودکار" hint="بعد از هر فاکتور، درصدی از پرداخت واقعی به کیف پول مشتری برمی‌گردد" action={<Toggle on={cb.on} onChange={(v) => setCb({ ...cb, on: v })} label="فعال بودن کش‌بک" />} />
          <div className="space-y-4 px-5 pb-5">
            <label className="flex items-center gap-3 text-sm">درصد
              <input type="range" min={1} max={15} value={cb.pct} onChange={(e) => setCb({ ...cb, pct: +e.target.value })} className="flex-1 accent-[var(--rose)]" /><b className="w-10">{fa(cb.pct)}٪</b>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="حداقل خرید (تومان)"><input inputMode="numeric" value={cb.minSpend} onChange={(e) => setCb({ ...cb, minSpend: +e.target.value.replace(/\D/g, "") })} className={fieldCls} /></Field>
              <Field label="سقف کش‌بک هر فاکتور"><input inputMode="numeric" value={cb.maxPerSale} onChange={(e) => setCb({ ...cb, maxPerSale: +e.target.value.replace(/\D/g, "") })} className={fieldCls} /></Field>
            </div>
            <div className="rounded-2xl bg-goldsoft p-4 text-sm leading-7">
              مشتری <input aria-label="مبلغ خرید نمونه" inputMode="numeric" value={sim} onChange={(e) => setSim(+e.target.value.replace(/\D/g, ""))} className="mx-1 w-28 rounded-lg border border-line bg-surface px-2 py-0.5 text-center" /> تومان پرداخت می‌کند ← <b>{simCb ? toman(simCb) : "بدون کش‌بک"}</b> برای خرید بعدی.
              <p className="mt-1 text-xs text-ink3">پرداخت با کیف پول و کارت هدیه کش‌بک نمی‌گیرد.</p>
            </div>
            <div className="flex items-center gap-3"><Button disabled={!dirty} onClick={() => { growth.saveLoyalty({ ...db.loyalty, cashback: cb }); setSaved(true); setTimeout(() => setSaved(false), 2200); }}>ذخیره</Button>{saved && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
            {!db.loyalty.cashback?.on && <p className="text-xs text-amber">کش‌بک فعلاً غیرفعال است؛ برای اعمال روی فاکتورهای جدید روشن و ذخیره کنید.</p>}
          </div>
        </Card>

        <Card>
          <CardHead title="آخرین تراکنش‌های کیف پول" hint="از فاکتورها، جایزه‌ها، کارت هدیه و ثبت دستی" />
          <ul className="divide-y divide-line">
            {recent.map((x, i) => { const I = kindIcon(x.note); return (
              <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm"><I size={16} className="shrink-0 text-ink3" /><span className="min-w-0 flex-1"><b className="block truncate">{x.name}</b><span className="text-xs text-ink3">{x.note} · {x.d}</span></span><b className={x.delta < 0 ? "text-danger" : "text-sage"}>{x.delta < 0 ? "−" : "+"}{short(Math.abs(x.delta))}</b></li>); })}
            {!recent.length && <li className="px-5 py-8 text-center text-sm text-ink3">هنوز تراکنشی ثبت نشده است.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="مشتریان دارای اعتبار" hint="شارژ یا کسر دستی اعتبار (هدیه، جبران خسارت، اصلاح)" />
        <ul className="divide-y divide-line">
          {holders.slice(0, 12).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
              <Avatar name={c.name} size={36} />
              <div className="min-w-0 flex-1 basis-36"><p className="truncate text-sm font-bold">{c.name}</p><Badge tone="sage" className="mt-0.5">{toman(c.wallet)}</Badge></div>
              {adj?.id === c.id ? (
                <span className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto"><input aria-label="مبلغ (±)" inputMode="numeric" placeholder="±مبلغ" value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} className={`${fieldCls} !w-28`} /><input aria-label="دلیل" placeholder="دلیل" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} className={`${fieldCls} !w-32`} /><Button variant="soft" onClick={() => { const n = parseInt(adj.delta.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[^\d-]/g, ""), 10) || 0; if (n) growth.adjustWallet(c.id, n, adj.note.trim()); setAdj(null); }}>ثبت</Button></span>
              ) : <Button variant="ghost" onClick={() => setAdj({ id: c.id, delta: "", note: "" })}>تغییر اعتبار</Button>}
            </li>
          ))}
          {!holders.length && <li className="px-5 py-8 text-center text-sm text-ink3">هنوز مشتری‌ای اعتبار ندارد.</li>}
        </ul>
      </Card>
    </>
  );
}
