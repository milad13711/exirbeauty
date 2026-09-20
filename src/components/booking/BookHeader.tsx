"use client";
import { AtSign, MapPin, Send } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { BrandMark } from "@/components/BrandMark";
import { useDB } from "@/lib/db";
import { fa } from "@/lib/fa";

export function BookHeader({ staffId }: { staffId?: string }) {
  const db = useDB();
  const s = db.staff.find((x) => x.id === staffId && x.active);
  const pr = db.salon.profile;
  if (!s) return (
    <div className="mb-5 overflow-hidden rounded-[24px] border border-line/80 bg-surface shadow-[var(--shadow-card)]">
      <div className="relative h-24 bg-[image:var(--grad-plum)]">{pr?.cover && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pr.cover})` }} />}</div>
      <div className="-mt-8 px-4 pb-4">
        <div className="w-fit rounded-[24px] border-4 border-surface"><BrandMark size={60} /></div>
        <h1 className="mt-2 text-xl font-extrabold">رزرو نوبت از {db.salon.name}</h1>
        {pr?.about && <p className="mt-1 text-sm leading-7 text-ink2">{pr.about}</p>}
        {!!pr?.tags.length && <div className="mt-2 flex flex-wrap gap-1.5">{pr.tags.map((t) => <span key={t} className="rounded-full bg-rosesoft px-2.5 py-0.5 text-[11px] font-bold text-rosedeep">{t}</span>)}</div>}
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-ink2">
          {pr?.instagram && <a href={`https://instagram.com/${pr.instagram}`} className="inline-flex items-center gap-1" target="_blank" rel="noreferrer"><AtSign size={14} className="text-rose" />{pr.instagram}</a>}
          {pr?.telegram && <a href={`https://t.me/${pr.telegram}`} className="inline-flex items-center gap-1" target="_blank" rel="noreferrer"><Send size={14} className="text-rose" />{pr.telegram}</a>}
          {pr?.mapUrl && <a href={pr.mapUrl} className="inline-flex items-center gap-1" target="_blank" rel="noreferrer"><MapPin size={14} className="text-rose" />{db.salon.address || "نقشه"}</a>}
        </div>
      </div>
    </div>
  );
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <Avatar name={s.name} color={s.color} size={52} />
      <div className="min-w-0 flex-1"><h1 className="font-extrabold">رزرو نوبت از {s.name}</h1><p className="text-sm text-ink2">{s.role}{s.rating ? ` · ★ ${fa(s.rating)}` : ""}</p></div>
    </div>
  );
}
