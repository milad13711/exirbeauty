import { Droplets, Gift, Hand, Sparkles } from "lucide-react";
import type { SCat } from "@/lib/mock3";

const icons = { "مو": Sparkles, "پوست": Droplets, "ناخن": Hand, "ست هدیه": Gift } as const;
export function ProductArt({ cat, tint, className = "" }: { cat: SCat; tint: string[]; className?: string }) {
  const I = icons[cat];
  return (
    <div className={`grid place-items-center ${className}`} style={{ background: `linear-gradient(150deg, ${tint[0]}, ${tint[1]})` }} aria-hidden>
      <I size={40} className="text-rosedeep/60" strokeWidth={1.4} />
    </div>
  );
}
