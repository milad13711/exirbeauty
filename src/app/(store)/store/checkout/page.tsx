"use client";
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";
import { actions, useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { fa, toman } from "@/lib/fa";

import { fieldCls } from "@/components/ui";
const field = fieldCls;

export default function Checkout() {
  const { lines, add, dec, clear, refSalon } = useCart();
  const db = useDB();
  const [paid, setPaid] = useState<string | null>(null);
  const items = db.products.filter((p) => lines[p.id]);
  const sub = items.reduce((a, p) => a + p.price * lines[p.id], 0);
  const ship = sub > 2_000_000 || !sub ? 0 : 60_000;

  if (paid) return (
    <div className="mx-auto max-w-md rounded-[28px] border border-line/80 bg-surface p-8 shadow-[var(--shadow-card)] text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-sagesoft text-sage"><CheckCircle2 size={36} /></span>
      <h1 className="mt-3 text-xl font-extrabold">سفارش شما ثبت شد</h1>
      <p className="mt-2 text-sm text-ink2">شماره‌ی سفارش: <b>#{paid}</b> · پیامک پیگیری برای شما ارسال می‌شود.</p>
      <Link href="/store" className="press mt-5 inline-flex min-h-12 items-center rounded-[16px] bg-[image:var(--grad-rose)] px-6 text-sm font-bold text-white">بازگشت به فروشگاه</Link>
    </div>
  );
  if (!items.length) return (
    <div className="py-20 text-center"><p className="text-ink2">سبد خرید شما خالی است.</p><Link href="/store" className="mt-4 inline-block text-sm font-bold text-rose">دیدن محصولات ←</Link></div>
  );
  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold">سبد خرید و پرداخت</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ul className="divide-y divide-line rounded-[22px] border border-line/80 bg-surface shadow-[var(--shadow-card)]">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="size-16 shrink-0 rounded-2xl" style={{ background: `linear-gradient(150deg, ${p.tint[0]}, ${p.tint[1]})` }} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name}</p><p className="text-xs text-ink3">{toman(p.price)}</p></div>
                <div className="flex items-center gap-2">
                  <button aria-label="کم" onClick={() => dec(p.id)} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line"><Minus size={13} /></button>
                  <b className="w-4 text-center text-sm">{fa(lines[p.id])}</b>
                  <button aria-label="زیاد" onClick={() => add(p.id)} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line"><Plus size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const no = actions.createOrder({ customer: String(f.get("name")), phone: String(f.get("phone")), address: String(f.get("address")), lines, salon: refSalon?.id ?? null, via: refSalon ? "لینک اختصاصی سالن" : "مستقیم" }); ops.notify("admin", "سفارش جدید فروشگاه", `سفارش #${no}${refSalon ? ` از طریق ${refSalon.name}` : ""}`, "/admin/orders"); setPaid(no); clear(); }} id="co" className="space-y-3 rounded-[22px] border border-line/80 bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">اطلاعات گیرنده</h2>
            <input required name="name" aria-label="نام و نام خانوادگی" placeholder="نام و نام خانوادگی" className={field} />
            <input required name="phone" aria-label="شماره موبایل" inputMode="tel" placeholder="شماره موبایل" className={field} dir="ltr" style={{ textAlign: "right" }} />
            <textarea required name="address" aria-label="آدرس" rows={3} placeholder="آدرس کامل" className={field} />
          </form>
        </div>
        <aside className="h-fit space-y-3 rounded-[22px] border border-line/80 bg-surface p-5 text-sm shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          {refSalon && <p className="rounded-xl bg-rosesoft p-3 text-xs leading-6 text-rosedeep">🌸 این خرید از طریق <b>{refSalon.name}</b> معرفی شده است.</p>}
          <div className="flex justify-between"><span className="text-ink2">جمع کالاها</span><span>{toman(sub)}</span></div>
          <div className="flex justify-between"><span className="text-ink2">هزینه ارسال</span><span>{ship ? toman(ship) : "رایگان"}</span></div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-extrabold"><span>قابل پرداخت</span><span className="text-rosedeep">{toman(sub + ship)}</span></div>
          <button form="co" type="submit" className="press min-h-12 w-full cursor-pointer rounded-[16px] bg-[image:var(--grad-rose)] text-sm font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(156,53,88,.7)]">پرداخت آنلاین</button>
        </aside>
      </div>
    </>
  );
}
