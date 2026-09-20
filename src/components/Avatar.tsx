"use client";
import { useDB } from "@/lib/db";
import { initials } from "@/lib/fa";

/** آواتار با عکس پروفایل؛ اگر src نباشد، عکس مشتری/متخصص/کاربری با همین نام پیدا می‌شود، وگرنه حروف اول */
export function Avatar({ name, size = 36, color = "#b5476b", src }: { name: string; size?: number; color?: string; src?: string }) {
  const db = useDB();
  const photo = src ?? db.customers.find((c) => c.name === name)?.photo ?? db.staff.find((s) => s.name === name)?.photo ?? db.users.find((u) => u.name === name)?.photo;
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full bg-surface2 object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]" aria-hidden />;
  }
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-[inset_0_-6px_12px_rgba(0,0,0,.12)]" style={{ width: size, height: size, background: `linear-gradient(145deg, ${color}, ${color}cc)`, fontSize: size * 0.4 }} aria-hidden>
      {initials(name)}
    </span>
  );
}
