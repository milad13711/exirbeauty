import { Droplets, Gift, Hand, Sparkles } from "lucide-react";
import type { SCat } from "@/lib/mock3";

const icons = { "مو": Sparkles, "پوست": Droplets, "ناخن": Hand, "ست هدیه": Gift } as const;
export function ProductArt({ cat, tint, className = "", size = 40, children }: { cat: SCat; tint: string[]; className?: string; size?: number; children?: React.ReactNode }) {
  const I = icons[cat];
  return (
    <div className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: `linear-gradient(150deg, ${tint[0]}, ${tint[1]})` }}>
      <span className="absolute -left-6 -top-6 size-24 rounded-full bg-white/40" aria-hidden />
      <span className="absolute -bottom-8 -right-4 size-28 rounded-full bg-white/30" aria-hidden />
      <I size={size} className="relative text-rosedeep/55" strokeWidth={1.3} aria-hidden />
      {children}
    </div>
  );
}
