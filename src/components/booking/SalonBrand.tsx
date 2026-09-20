"use client";
import { BrandMark } from "@/components/BrandMark";
import { useDB } from "@/lib/db";

export function SalonBrand() {
  const { salon } = useDB();
  return (
    <>
      <BrandMark size={42} />
      <div className="leading-tight"><p className="font-extrabold">{salon.name}</p><p className="text-xs text-ink3">رزرو نوبت آنلاین · {salon.city}</p></div>
    </>
  );
}
