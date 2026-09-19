"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import { ProductArt } from "@/components/store/parts";
import { useCart } from "@/components/store/CartProvider";
import { catList, storeProducts } from "@/lib/mock3";
import { fa, short } from "@/lib/fa";

export default function Store() {
  const [cat, setCat] = useState<(typeof catList)[number]>("همه");
  const { add } = useCart();
  const rows = storeProducts.filter((p) => cat === "همه" || p.cat === cat);
  return (
    <>
      <section className="rounded-3xl bg-gradient-to-l from-rosesoft via-goldsoft to-rosesoft px-6 py-10 text-center md:py-14">
        <p className="text-xs font-bold text-rosedeep">توصیه‌ی متخصص‌های سالن</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-relaxed md:text-4xl">مراقبتِ بعد از سالن،<br />در خانه‌ی شما</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink2">همان محصولاتی که آرایشگر شما برای حفظ نتیجه‌ی رنگ، کراتین و پوست پیشنهاد می‌دهد.</p>
      </section>

      <div className="my-6 flex flex-wrap gap-2" role="tablist">
        {catList.map((c) => (
          <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", cat === c ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{c}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-5">
        {rows.map((p) => (
          <article key={p.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
            <Link href={`/store/p/${p.id}`} className="block">
              <ProductArt cat={p.cat} tint={p.tint} className="aspect-square transition-transform group-hover:scale-[1.02]" />
              <div className="space-y-1 p-3.5">
                <p className="text-[11px] text-ink3">{p.brand}</p>
                <h2 className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug">{p.name}</h2>
                <p className="flex items-center gap-1 text-xs text-gold"><Star size={12} fill="currentColor" />{fa(p.rating)}</p>
              </div>
            </Link>
            <div className="mt-auto flex items-center justify-between gap-2 px-3.5 pb-3.5">
              <p className="text-sm font-extrabold">{short(p.price)}<span className="text-[10px] font-medium text-ink3"> تومان</span>{p.old && <s className="block text-[11px] font-normal text-ink3">{short(p.old)}</s>}</p>
              <button onClick={() => add(p.id)} aria-label={`افزودن ${p.name} به سبد`} className="cursor-pointer rounded-xl bg-rose px-3 py-2 text-xs font-bold text-white hover:bg-rosedeep">افزودن</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
