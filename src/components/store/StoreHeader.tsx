"use client";
import Link from "next/link";
import { Flower2, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { fa } from "@/lib/fa";

export function StoreHeader() {
  const { count, refName } = useCart();
  return (
    <header className="glass sticky top-0 z-30 border-b border-line/70 pt-[env(safe-area-inset-top,0px)]">
      {refName && <p className="bg-[image:var(--grad-plum)] px-4 py-2 text-center text-[11.5px] leading-5 text-white/90">🌸 به توصیه‌ی <b className="text-[#e6c88e]">{refName}</b> برای شما باز شده است</p>}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 lg:px-8">
        <Link href="/store" className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-8px_rgba(156,53,88,.6)]"><Flower2 size={19} /></span>
          <span className="leading-tight"><span className="block text-[15px] font-extrabold">اکسیر شاپ</span><span className="block text-[10.5px] text-ink3">مراقبت و زیبایی</span></span>
        </Link>
        <Link href="/store/checkout" aria-label={`سبد خرید، ${fa(count)} کالا`} className="press relative grid size-11 place-items-center rounded-full border border-line bg-surface shadow-[var(--shadow-card)]">
          <ShoppingBag size={20} />
          {count > 0 && <span className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[image:var(--grad-rose)] px-1 text-[11px] font-bold text-white">{fa(count)}</span>}
        </Link>
      </div>
    </header>
  );
}
