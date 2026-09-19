"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Minus, Plus, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductArt } from "@/components/store/parts";
import { useCart } from "@/components/store/CartProvider";
import { useDB } from "@/lib/db";
import { fa, short, toman } from "@/lib/fa";

export function ProductView({ id }: { id: string }) {
  const db = useDB();
  const { add, lines } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const p = db.products.find((x) => x.id === id && x.active);
  if (!p) return <div className="py-20 text-center"><p className="text-ink2">این محصول پیدا نشد.</p><Link href="/store" className="mt-3 inline-block font-bold text-rose">بازگشت به فروشگاه</Link></div>;

  const out = p.stock <= 0;
  const room = Math.max(0, p.stock - (lines[p.id] ?? 0));
  const related = db.products.filter((x) => x.active && x.cat === p.cat && x.id !== p.id).slice(0, 3);
  const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;

  return (
    <>
      <Link href="/store" className="mb-4 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی محصولات</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductArt cat={p.cat} tint={p.tint} size={72} className="aspect-square rounded-3xl" />
        <div className="min-w-0">
          <p className="text-xs text-ink3">{p.brand} · {p.cat}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-relaxed">{p.name}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-gold"><Star size={14} fill="currentColor" />{fa(p.rating)}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-3"><p className="text-3xl font-extrabold">{toman(p.price)}</p>{p.old && <><s className="text-sm text-ink3">{toman(p.old)}</s><span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">{fa(off)}٪ تخفیف</span></>}</div>
          <p className="mt-4 text-sm leading-7 text-ink2">{p.desc}</p>
          <p className={`mt-4 text-sm font-semibold ${out ? "text-danger" : p.stock <= 5 ? "text-amber" : "text-sage"}`}>{out ? "ناموجود" : p.stock <= 5 ? `تنها ${fa(p.stock)} عدد باقی مانده` : "موجود در انبار"}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5">
              <button aria-label="کم" disabled={qty <= 1} onClick={() => setQty(qty - 1)} className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2 disabled:opacity-40"><Minus size={14} /></button>
              <b className="w-6 text-center text-sm">{fa(Math.min(qty, Math.max(room, 1)))}</b>
              <button aria-label="زیاد" disabled={qty >= room} onClick={() => setQty(qty + 1)} className="cursor-pointer rounded-lg p-1.5 hover:bg-surface2 disabled:opacity-40"><Plus size={14} /></button>
            </div>
            <button disabled={out || room <= 0} onClick={() => { for (let i = 0; i < Math.min(qty, room); i++) add(p.id); setAdded(true); setQty(1); }} className="cursor-pointer rounded-xl bg-rose px-6 py-3 text-sm font-bold text-white hover:bg-rosedeep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink3">{out ? "ناموجود" : "افزودن به سبد خرید"}</button>
            {added && <Link href="/store/checkout" className="text-sm font-semibold text-rose">مشاهده‌ی سبد و پرداخت ←</Link>}
          </div>
          <ul className="mt-6 space-y-2 text-sm text-ink2">
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-sage" />اصالت کالا تضمین می‌شود</li>
            <li className="flex items-center gap-2"><Truck size={16} className="text-sage" />ارسال به سراسر کشور · مرجوعی تا ۷ روز</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-extrabold">محصولات مرتبط</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/store/p/${r.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface hover:shadow-md">
                <ProductArt cat={r.cat} tint={r.tint} className="aspect-[4/3]" />
                <div className="p-3"><p className="line-clamp-1 text-sm font-bold">{r.name}</p><p className="mt-1 text-xs text-ink2">{short(r.price)} تومان</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
