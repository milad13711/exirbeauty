"use client";
import { useState } from "react";
import clsx from "clsx";
import { Banknote, CreditCard, Globe, Minus, Plus, Receipt, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat, type Tone } from "@/components/ui";
import { catalog, expenses, invoices, posProducts } from "@/lib/mock2";
import { fa, short, toman } from "@/lib/fa";

const methods = [{ k: "نقدی", i: Banknote }, { k: "کارت", i: CreditCard }, { k: "آنلاین", i: Globe }, { k: "بدهی", i: Wallet }] as const;
const mTone: Record<string, Tone> = { "نقدی": "sage", "کارت": "sky", "آنلاین": "rose", "بدهی": "danger" };

export default function Cashier() {
  const [cart, setCart] = useState<Record<string, number>>({ v1: 1, p1: 1 });
  const [disc, setDisc] = useState(10);
  const [method, setMethod] = useState<string>("کارت");
  const all = [...catalog.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name, price: s.price })), ...posProducts];
  const lines = all.filter((x) => cart[x.id]);
  const sub = lines.reduce((a, l) => a + l.price * cart[l.id], 0);
  const total = Math.round(sub * (1 - disc / 100));
  const bump = (id: string, d: number) => setCart((c) => { const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }; if (!next[id]) delete next[id]; return next; });

  const spent = expenses.reduce((a, e) => a + e.v, 0);
  return (
    <>
      <PageTitle title="صندوق و درآمد" sub="ساده و روزانه؛ بدون حسابداری پیچیده" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="فروش خدمات" value={short(15_300_000)} tone="rose" />
        <Stat label="فروش محصول" value={short(3_200_000)} tone="gold" />
        <Stat label="تخفیف‌ها" value={short(1_150_000)} tone="amber" />
        <Stat label="نقدی" value={short(4_900_000)} tone="sage" />
        <Stat label="کارت" value={short(8_100_000)} tone="sky" />
        <Stat label="آنلاین" value={short(4_600_000)} tone="rose" />
        <Stat label="بدهی مشتریان" value={short(850_000)} tone="danger" />
        <Stat label="پورسانت امروز" value={short(5_400_000)} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_400px]">
        <div className="space-y-5">
          <Card>
            <CardHead title="فاکتورهای امروز" action={<Receipt size={17} className="text-ink3" />} />
            <ul className="divide-y divide-line border-t border-line md:hidden">
              {invoices.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b className="block truncate">{v.client}</b><span className="block truncate text-xs text-ink3">#{v.id} · {v.items}</span></span><span className="flex flex-col items-end gap-1"><b>{short(v.total)}</b><Badge tone={mTone[v.method]}>{v.method}</Badge></span></li>
              ))}
            </ul>
            <div className="hidden md:block"><table className="w-full text-sm">
              <thead className="border-y border-line text-right text-xs text-ink3"><tr>{["شماره", "مشتری", "اقلام", "متخصص", "مبلغ", "پرداخت"].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{invoices.map((v) => (
                <tr key={v.id} className="border-b border-line/60 last:border-0">
                  <td className="px-5 py-3 text-ink3">#{v.id}</td><td className="px-5 font-semibold">{v.client}</td><td className="px-5 text-ink2">{v.items}</td><td className="px-5 text-ink2">{v.staff}</td>
                  <td className="px-5 font-bold">{short(v.total)}</td><td className="px-5"><Badge tone={mTone[v.method]}>{v.method}</Badge></td>
                </tr>))}</tbody>
            </table></div>
          </Card>
          <Card>
            <CardHead title="هزینه‌های امروز" hint={`مجموع ${toman(spent)}`} />
            <ul className="divide-y divide-line">{expenses.map((e) => <li key={e.t} className="flex justify-between px-5 py-3 text-sm"><span>{e.t}</span><b>{toman(e.v)}</b></li>)}</ul>
            <div className="px-5 py-3"><Button variant="ghost">+ ثبت هزینه</Button></div>
          </Card>
        </div>

        {/* پیش‌فاکتور / صدور */}
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHead title="صدور فاکتور جدید" hint="مشتری: سارا محمدی · ۱۰٪ تخفیف VIP" />
          <div className="scroll-thin max-h-56 space-y-1 overflow-y-auto px-5">
            {all.map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="flex-1">{x.name}<span className="mr-1.5 text-xs text-ink3">{short(x.price)}</span></span>
                <button aria-label="کم" onClick={() => bump(x.id, -1)} className="cursor-pointer rounded-md border border-line p-1 hover:bg-surface2"><Minus size={12} /></button>
                <span className="w-4 text-center font-bold">{fa(cart[x.id] ?? 0)}</span>
                <button aria-label="زیاد" onClick={() => bump(x.id, 1)} className="cursor-pointer rounded-md border border-line p-1 hover:bg-surface2"><Plus size={12} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-3 border-t border-line px-5 py-4 text-sm">
            <label className="flex items-center justify-between">تخفیف (٪)<input type="number" min={0} max={100} value={disc} onChange={(e) => setDisc(Math.min(100, Math.max(0, +e.target.value || 0)))} className="w-16 rounded-lg border border-line px-2 py-1 text-center" /></label>
            <div className="grid grid-cols-4 gap-1.5">{methods.map(({ k, i: I }) => (
              <button key={k} onClick={() => setMethod(k)} className={clsx("flex cursor-pointer flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-semibold", method === k ? "border-rose bg-rosesoft text-rosedeep" : "border-line text-ink2")}><I size={16} />{k}</button>
            ))}</div>
            <div className="flex justify-between text-ink2"><span>جمع</span><span>{toman(sub)}</span></div>
            <div className="flex justify-between text-lg font-extrabold"><span>قابل پرداخت</span><span className="text-rosedeep">{toman(total)}</span></div>
            <Button className="w-full" disabled={!total}>ثبت پرداخت ({method})</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
