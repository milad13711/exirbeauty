"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { RotateCcw, Search, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductArt } from "@/components/store/parts";
import { useCart } from "@/components/store/CartProvider";
import { useDB } from "@/lib/db";
import { catList } from "@/lib/mock3";
import { fa, short } from "@/lib/fa";

const sorts = [
  { k: "def", l: "پیشنهادی" }, { k: "asc", l: "ارزان‌ترین" }, { k: "desc", l: "گران‌ترین" }, { k: "rate", l: "بالاترین امتیاز" },
] as const;
const trust = [{ i: ShieldCheck, t: "اصالت کالا تضمین‌شده" }, { i: Truck, t: "ارسال به سراسر کشور" }, { i: RotateCcw, t: "مرجوعی تا ۷ روز" }];

export default function Store() {
  const db = useDB();
  const { add, lines } = useCart();
  const [cat, setCat] = useState<(typeof catList)[number]>("همه");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<(typeof sorts)[number]["k"]>("def");

  const rows = db.products
    .filter((p) => p.active && (cat === "همه" || p.cat === cat) && (`${p.name} ${p.brand}`.includes(q.trim())))
    .sort((a, b) => (sort === "asc" ? a.price - b.price : sort === "desc" ? b.price - a.price : sort === "rate" ? b.rating - a.rating : 0));

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-rosesoft via-goldsoft to-rosesoft px-6 py-10 text-center md:py-16">
        <span className="absolute -right-10 -top-10 size-40 rounded-full bg-white/40" aria-hidden />
        <span className="absolute -bottom-12 -left-8 size-48 rounded-full bg-white/30" aria-hidden />
        <div className="relative">
          <p className="text-xs font-bold tracking-wide text-rosedeep">توصیه‌ی متخصص‌های سالن</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-relaxed md:text-4xl">مراقبتِ بعد از سالن،<br />در خانه‌ی شما</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink2">همان محصولاتی که آرایشگر شما برای حفظ نتیجه‌ی رنگ، کراتین و پوست پیشنهاد می‌دهد.</p>
          <a href="#products" className="mt-5 inline-block rounded-xl bg-rose px-6 py-3 text-sm font-bold text-white hover:bg-rosedeep">دیدن محصولات</a>
        </div>
      </section>

      <ul className="my-5 grid gap-2 sm:grid-cols-3">
        {trust.map(({ i: I, t }) => <li key={t} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink2"><I size={18} className="text-sage" />{t}</li>)}
      </ul>

      <div id="products" className="scroll-mt-24 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-56">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی محصول" placeholder="جستجوی محصول یا برند…" className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3 text-sm outline-none focus:border-rose" />
          </label>
          <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold">
            {sorts.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist">
          {catList.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", cat === c ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{c}</button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {rows.map((p) => {
          const out = p.stock <= 0;
          const inCart = lines[p.id] ?? 0;
          const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
          return (
            <article key={p.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-lg">
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
                <p className="text-sm font-extrabold">{short(p.price)}<span className="text-[10px] font-medium text-ink3"> تومان</span>{p.old && <s className="block text-[11px] font-normal text-ink3">{short(p.old)}</s>}</p>
                <button disabled={out || inCart >= p.stock} onClick={() => add(p.id)} aria-label={`افزودن ${p.name} به سبد`} className="cursor-pointer rounded-xl bg-rose px-3 py-2 text-xs font-bold text-white hover:bg-rosedeep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink3">{out ? "ناموجود" : inCart ? `در سبد (${fa(inCart)})` : "افزودن"}</button>
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && <p className="py-16 text-center text-sm text-ink3">محصولی با این مشخصات پیدا نشد.</p>}
    </>
  );
}
