"use client";
import { Flower2 } from "lucide-react";
import { useDB } from "@/lib/db";

export function SalonBrand() {
  const { salon } = useDB();
  return (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-rose text-white"><Flower2 size={20} /></span>
      <div className="leading-tight"><p className="font-extrabold">{salon.name}</p><p className="text-xs text-ink3">رزرو نوبت آنلاین · {salon.city}</p></div>
    </>
  );
}
