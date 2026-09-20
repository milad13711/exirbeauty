"use client";
import { Flower2 } from "lucide-react";
import { useDB } from "@/lib/db";
import { brandOf } from "@/lib/theme";

/** لوگوی تننت؛ اگر لوگو آپلود نشده باشد، نماد پیش‌فرض روی رنگ برند */
export function BrandMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const db = useDB();
  const { logo } = brandOf(db.salon);
  const r = Math.round(size * 0.3);
  return logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" width={size} height={size} style={{ width: size, height: size, borderRadius: r }} className={`shrink-0 bg-surface object-contain p-0.5 shadow-[var(--shadow-card)] ${className}`} />
  ) : (
    <span style={{ width: size, height: size, borderRadius: r }} className={`grid shrink-0 place-items-center bg-[image:var(--grad-rose)] text-white ${className}`}><Flower2 size={size * 0.5} /></span>
  );
}
