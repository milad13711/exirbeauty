import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductArt } from "@/components/store/parts";
import { AddToCart } from "./AddToCart";
import { storeProducts } from "@/lib/mock3";
import { fa, toman } from "@/lib/fa";

export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = storeProducts.find((x) => x.id === id);
  if (!p) notFound();
  return (
    <>
      <Link href="/store" className="mb-4 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />همه‌ی محصولات</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductArt cat={p.cat} tint={p.tint} className="aspect-square rounded-3xl" />
        <div className="min-w-0">
          <p className="text-xs text-ink3">{p.brand} · {p.cat}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-relaxed">{p.name}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-gold"><Star size={14} fill="currentColor" />{fa(p.rating)}</p>
          <p className="mt-4 text-3xl font-extrabold">{toman(p.price)}</p>
          {p.old && <s className="text-sm text-ink3">{toman(p.old)}</s>}
          <p className="mt-4 text-sm leading-7 text-ink2">{p.desc}</p>
          <AddToCart id={p.id} />
          <ul className="mt-6 space-y-2 text-sm text-ink2">
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-sage" />اصالت کالا تضمین می‌شود</li>
            <li className="flex items-center gap-2"><Truck size={16} className="text-sage" />ارسال به سراسر کشور · مرجوعی تا ۷ روز</li>
          </ul>
        </div>
      </div>
    </>
  );
}
