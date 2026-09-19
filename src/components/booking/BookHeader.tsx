"use client";
import { Avatar } from "@/components/ui";
import { useDB } from "@/lib/db";
import { fa } from "@/lib/fa";

export function BookHeader({ staffId }: { staffId?: string }) {
  const db = useDB();
  const s = db.staff.find((x) => x.id === staffId && x.active);
  if (!s) return <h1 className="mb-5 text-xl font-extrabold">رزرو نوبت</h1>;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <Avatar name={s.name} color={s.color} size={52} />
      <div className="min-w-0 flex-1"><h1 className="font-extrabold">رزرو نوبت از {s.name}</h1><p className="text-sm text-ink2">{s.role}{s.rating ? ` · ★ ${fa(s.rating)}` : ""}</p></div>
    </div>
  );
}
