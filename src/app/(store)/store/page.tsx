"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { RotateCcw, Search, ShoppingBag, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductArt } from "@/components/store/parts";
import { useCart } from "@/components/store/CartProvider";
import { fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { catList } from "@/lib/mock3";
import { fa, short } from "@/lib/fa";

const sorts = [
  { k: "def", l: "پیشنهادی" }, { k: "asc", l: "ارزان‌ترین" }, { k: "desc", l: "گران‌ترین" }, { k: "rate", l: "بالاترین امتیاز" },
] as const;
const trust = [{ i: ShieldCheck, t: "اصالت کالا تضمین‌شده" }, { i: Truck, t: "ارسال به سراسر کشور" }, { i: RotateCcw, t: "مرجوعی تا ۷ روز" }];

export default function Store() {
  const db = useDB();
  const { add, lines, count: cartCount } = useCart();
  const [cat, setCat] = useState<(typeof catList)[number]>("همه");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof sorts)[number]["k"]>("def");

  const rows = db.products
    .filter((p) => p.active && (cat === "همه" || p.cat === cat) && (`${p.name} ${p.brand}`.includes(q.trim())))
    .sort((a, b) => (sort === "asc" ? a.price - b.price : sort === "desc" ? b.price - a.price : sort === "rate" ? b.rating - a.rating : 0));

  return (
    <>
      <section className="relative overflow-hidden rounded-[28px] bg-[image:var(--grad-plum)] px-6 py-9 text-white shadow-[var(--shadow-pop)] md:py-16">
        <span className="pointer-events-none absolute -left-16 -top-20 size-64 rounded-full bg-[radial-gradient(circle,rgba(217,181,111,.4),transparent_65%)]" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(198,90,128,.5),transparent_65%)]" aria-hidden />
        <div className="relative">
          <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-[#e6c88e]">توصیه‌ی متخصص‌های سالن</p>
          <h1 className="mt-3 text-[26px] font-extrabold leading-[1.6] md:text-4xl">مراقبتِ بعد از سالن،<br />در خانه‌ی شما</h1>
          <p className="mt-2 max-w-md text-[13px] leading-7 text-white/70">همان محصولاتی که آرایشگر شما برای حفظ نتیجه‌ی رنگ، کراتین و پوست پیشنهاد می‌دهد.</p>
          <a href="#products" className="press mt-5 inline-flex min-h-12 items-center rounded-[16px] bg-[image:var(--grad-gold)] px-7 text-sm font-extrabold text-plum">دیدن محصولات</a>
        </div>
      </section>

      <ul className="my-4 grid grid-cols-3 gap-2">
        {trust.map(({ i: I, t }) => <li key={t} className="flex flex-col items-center gap-1.5 rounded-2xl border border-line/80 bg-surface px-1.5 py-3 text-center text-[11px] font-semibold leading-4 text-ink2 shadow-[var(--shadow-card)]"><span className="grid size-9 place-items-center rounded-full bg-sagesoft text-sage"><I size={17} /></span>{t}</li>)}
      </ul>

      <div id="products" className="scroll-mt-24 space-y-3">
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی محصول" placeholder="جستجوی محصول یا برند…" className={clsx(fieldCls, "!rounded-2xl pr-10")} />
          </label>
          <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="min-h-11 w-[38%] max-w-40 cursor-pointer rounded-2xl border border-line bg-surface px-2.5 text-[13px] font-semibold outline-none focus:border-rose">
            {sorts.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {catList.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("press min-h-10 cursor-pointer rounded-full px-4 text-[13px] font-bold", cat === c ? "bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border border-line bg-surface text-ink2")}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {rows.map((p) => {
          const out = p.stock <= 0;
          const inCart = lines[p.id] ?? 0;
          const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
          return (
            <article key={p.id} className="press group flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line/80 bg-surface shadow-[var(--shadow-card)]">
              <Link href={`/store/p/${p.id}`} className="block">
                <ProductArt cat={p.cat} tint={p.tint} className={clsx("aspect-square", out && "opacity-50")}>
                  {off > 0 && <span className="absolute right-2.5 top-2.5 rounded-full bg-danger px-2 py-0.5 text-[11px] font-bold text-white">{fa(off)}٪ تخفیف</span>}
                  {out && <span className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-plum px-3 py-1 text-xs font-bold text-white">ناموجود</span>}
                  {!out && p.stock <= 5 && <span className="absolute bottom-2.5 left-2.5 rounded-full bg-amber px-2 py-0.5 text-[11px] font-bold text-white">فقط {fa(p.stock)} عدد</span>}
                </ProductArt>
                <div className="space-y-1 p-3.5">
                  <p className="text-[11px] text-ink3">{p.brand}</p>
                  <h2 className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug">{p.name}</h2>
                  <p className="flex items-center gap-1 text-xs text-gold"><Star size={12} fill="currentColor" />{fa(p.rating)}</p>
                </div>
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 px-3.5 pb-3.5">
                <p className="font-num text-sm font-extrabold">{short(p.price)}<span className="text-[10px] font-medium text-ink3"> تومان</span>{p.old && <s className="block text-[11px] font-normal text-ink3">{short(p.old)}</s>}</p>
                <button disabled={out || inCart >= p.stock} onClick={() => add(p.id)} aria-label={`افزودن ${p.name} به سبد`} className="press min-h-10 cursor-pointer rounded-[14px] bg-[image:var(--grad-rose)] px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-none disabled:bg-line disabled:text-ink3">{out ? "ناموجود" : inCart ? `${fa(inCart)} ＋` : "افزودن"}</button>
              </div>
            </article>
          );
        })}
      </div>
      {cartCount > 0 && (
        <Link href="/store/checkout" className="press glass fixed inset-x-4 bottom-[calc(var(--safe-b)+1rem)] z-30 mx-auto flex max-w-md items-center justify-between rounded-[22px] border border-line bg-plum/95 px-5 py-3.5 text-white shadow-[var(--shadow-pop)]">
          <span className="flex items-center gap-2 text-sm font-bold"><ShoppingBag size={18} className="text-[#e6c88e]" />{fa(cartCount)} کالا در سبد</span>
          <span className="text-sm font-extrabold text-[#e6c88e]">مشاهده و پرداخت ←</span>
        </Link>
      )}
      {!rows.length && <p className="py-16 text-center text-sm text-ink3">محصولی با این مشخصات پیدا نشد.</p>}
    </>
  );
}
