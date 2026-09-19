"use client";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/store/CartProvider";

export function AddToCart({ id }: { id: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button onClick={() => { add(id); setDone(true); }} className="cursor-pointer rounded-xl bg-rose px-6 py-3 text-sm font-bold text-white hover:bg-rosedeep">افزودن به سبد خرید</button>
      {done && <Link href="/store/checkout" className="text-sm font-semibold text-rose">مشاهده‌ی سبد و پرداخت ←</Link>}
    </div>
  );
}
