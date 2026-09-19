"use client";
import Link from "next/link";
import { Flower2, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { fa } from "@/lib/fa";

export function StoreHeader() {
  const { count, refSalon } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      {refSalon && <p className="bg-plum px-4 py-1.5 text-center text-xs text-white">🌸 این فروشگاه به توصیه‌ی <b>{refSalon.name}</b> برای شما باز شده است</p>}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
        <Link href="/store" className="flex items-center gap-2 font-extrabold"><span className="grid size-8 place-items-center rounded-lg bg-rose text-white"><Flower2 size={17} /></span>اکسیر شاپ</Link>
        <Link href="/store/checkout" aria-label={`سبد خرید، ${fa(count)} کالا`} className="relative rounded-xl border border-line bg-surface p-2.5 hover:bg-surface2">
          <ShoppingBag size={19} />
          {count > 0 && <span className="absolute -left-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">{fa(count)}</span>}
        </Link>
      </div>
    </header>
  );
}
