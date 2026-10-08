"use client";
import Link from "next/link";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/store/CartProvider";
import { Spinner } from "@/components/live/ui";
import { fieldCls } from "@/components/ui";
import { errorText } from "@/lib/api";
import { store, tintOf } from "@/lib/storeApi";
import { useQuery } from "@/lib/useQuery";
import { digits } from "@/lib/validate";
import { fa, toman } from "@/lib/fa";

const field = fieldCls;

export default function Checkout() {
  const { lines, add, dec, ref, refName } = useCart();
  const all = useQuery(() => store.products(), []);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const items = (all.data ?? []).filter((p) => lines[p.id]);
  const sub = items.reduce((a, p) => a + p.price * lines[p.id], 0);
  const ship = !sub || sub > 2_000_000 ? 0 : 60_000; // same rule as the server, which is the one that charges it
  

  async function submit(f: FormData) {
    setErr(""); setBusy(true);
    try {
      const r = await store.order({
        items: items.map((p) => ({ productId: p.id, qty: lines[p.id] })),
        customerName: String(f.get("name")).trim(), phone: digits(String(f.get("phone"))).replace(/[\s-]/g, ""), city: String(f.get("city")).trim(), address: String(f.get("address")).trim(), postalCode: String(f.get("postal") ?? "").trim(), ...(ref ? { ref } : {}),
      });
      window.location.assign(r.paymentUrl); // the cart is cleared once the payment page reports success
    } catch (e) { setErr(errorText(e)); setBusy(false); }
  }

  if (all.loading && !all.data) return <Spinner />;
  if (!items.length) return <div className="py-20 text-center"><p className="text-ink2">سبد خرید شما خالی است.</p><Link href="/store" className="mt-4 inline-block text-sm font-bold text-rose">دیدن محصولات ←</Link></div>;
  return (
    <>
      <h1 className="mb-4 text-[22px] font-extrabold">سبد خرید و پرداخت</h1>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ul className="divide-y divide-line rounded-[22px] border border-line/80 bg-surface shadow-[var(--shadow-card)]">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="size-16 shrink-0 rounded-2xl" style={{ background: `linear-gradient(150deg, ${tintOf(p.category)[0]}, ${tintOf(p.category)[1]})` }} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{p.name}</p><p className="text-xs text-ink3">{toman(p.price)}</p></div>
                <div className="flex items-center gap-2">
                  <button aria-label="کم" onClick={() => dec(p.id)} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line"><Minus size={13} /></button>
                  <b className="w-4 text-center text-sm">{fa(lines[p.id])}</b>
                  <button aria-label="زیاد" disabled={lines[p.id] >= p.stock} onClick={() => add(p.id, p.stock)} className="grid size-9 cursor-pointer place-items-center rounded-xl border border-line disabled:opacity-40"><Plus size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); void submit(new FormData(e.currentTarget)); }} id="co" className="space-y-3 rounded-[22px] border border-line/80 bg-surface p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-bold">اطلاعات گیرنده</h2>
            <input required name="name" aria-label="نام و نام خانوادگی" placeholder="نام و نام خانوادگی" className={field} />
            <input required name="phone" aria-label="شماره موبایل" inputMode="tel" placeholder="شماره موبایل" className={field} dir="ltr" style={{ textAlign: "right" }} />
            <div className="grid grid-cols-2 gap-3"><input required name="city" aria-label="شهر" placeholder="شهر" className={field} /><input name="postal" aria-label="کد پستی" inputMode="numeric" placeholder="کد پستی (اختیاری)" className={field} dir="ltr" style={{ textAlign: "right" }} /></div>
            <textarea required name="address" aria-label="آدرس" rows={3} placeholder="آدرس کامل" className={field} />
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          </form>
        </div>
        <aside className="h-fit space-y-3 rounded-[22px] border border-line/80 bg-surface p-5 text-sm shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          {refName && <p className="rounded-xl bg-rosesoft p-3 text-xs leading-6 text-rosedeep">🌸 این خرید از طریق <b>{refName}</b> معرفی شده است.</p>}
          <div className="flex justify-between"><span className="text-ink2">جمع کالاها</span><span>{toman(sub)}</span></div>
          <div className="flex justify-between"><span className="text-ink2">هزینه ارسال</span><span>{ship ? toman(ship) : "رایگان"}</span></div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-extrabold"><span>قابل پرداخت</span><span className="text-rosedeep">{toman(sub + ship)}</span></div>
          <button form="co" type="submit" disabled={busy} className="press min-h-12 w-full cursor-pointer rounded-[16px] bg-[image:var(--grad-rose)] text-sm font-extrabold text-white shadow-[0_10px_22px_-10px_rgba(156,53,88,.7)] disabled:opacity-60">{busy ? "در حال انتقال به درگاه…" : "پرداخت آنلاین"}</button>
        </aside>
      </div>
    </>
  );
}
