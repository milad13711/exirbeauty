"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { MapPin, Search, Star } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui";
import { useDB } from "@/lib/db";
import { listPros } from "@/lib/market";
import { clock } from "@/lib/booking";
import { dayInfo } from "@/lib/dates";
import { fa, short } from "@/lib/fa";

const cats = ["همه", "مو", "پوست", "ناخن", "آرایش"] as const;
const sorts = [{ k: "rec", l: "پیشنهادی" }, { k: "rate", l: "بالاترین امتیاز" }, { k: "price", l: "ارزان‌ترین" }, { k: "slot", l: "نزدیک‌ترین وقت خالی" }] as const;

export default function Explore() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("همه");
  const [cat, setCat] = useState<(typeof cats)[number]>("همه");
  const [sort, setSort] = useState<(typeof sorts)[number]["k"]>("rec");
  const [onlySlot, setOnlySlot] = useState(false);
  const pros = useMemo(() => listPros(db), [db]);
  const cities = ["همه", ...new Set(pros.map((p) => p.city))];

  const rows = pros
    .filter((p) => (city === "همه" || p.city === city) && (cat === "همه" || p.cats.includes(cat)) && (!onlySlot || p.slot) && (!q.trim() || `${p.name} ${p.salon} ${p.services.map((s) => s.name).join(" ")}`.includes(q.trim())))
    .sort((a, b) => sort === "rate" ? b.rating - a.rating : sort === "price" ? a.from - b.from : sort === "slot" ? (a.slot ? a.slot.day * 1440 + a.slot.start : 1e9) - (b.slot ? b.slot.day * 1440 + b.slot.start : 1e9) : Number(b.own) - Number(a.own) || b.rating - a.rating);

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-l from-rosesoft via-goldsoft to-rosesoft px-6 py-8 text-center">
        <h1 className="text-2xl font-extrabold leading-relaxed md:text-3xl">بهترین متخصص زیبایی را پیدا کنید</h1>
        <p className="mt-2 text-sm text-ink2">نمونه‌کار، امتیاز واقعی، قیمت و وقت‌های خالی؛ همه یک‌جا</p>
      </section>

      <div className="my-5 space-y-3">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-0 flex-1 basis-56"><Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجو" placeholder="مثلاً: بالیاژ، فیشال، مریم…" className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-3 text-sm outline-none focus:border-rose" /></label>
          <select aria-label="شهر" value={city} onChange={(e) => setCity(e.target.value)} className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold">{cities.map((c) => <option key={c}>{c}</option>)}</select>
          <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold">{sorts.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {cats.map((c) => <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={clsx("cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-semibold", cat === c ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{c}</button>)}
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={onlySlot} onChange={(e) => setOnlySlot(e.target.checked)} className="size-4 accent-[#b4536f]" />فقط دارای وقت خالی</label>
        </div>
      </div>

      <p className="mb-3 text-sm text-ink2">{fa(rows.length)} متخصص</p>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/explore/${p.id}`} className="block">
            <Card className="h-full p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size={52} color={p.own ? "#b4536f" : "#8a5fb0"} />
                <div className="min-w-0 flex-1"><p className="font-bold">{p.name}</p><p className="flex items-center gap-1 text-xs text-ink3"><MapPin size={12} />{p.salon} · {p.city}</p></div>
                <span className="text-left text-sm font-bold text-gold"><Star size={13} className="ml-0.5 inline" fill="currentColor" />{fa(String(p.rating || "—").replace(".", "٫"))}<span className="block text-[10px] font-normal text-ink3">{fa(p.reviews)} نظر</span></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">{p.services.slice(0, 4).map((s) => <Badge key={s.name}>{s.name}</Badge>)}</div>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                <span className="text-ink2">از <b className="text-ink">{short(p.from)}</b> تومان</span>
                {p.own ? (p.slot ? <Badge tone="sage">{p.slot.day === 0 ? "امروز" : dayInfo(p.slot.day).weekday} {clock(p.slot.start)}</Badge> : <Badge tone="amber">وقت خالی در ۷ روز آینده ندارد</Badge>) : <Badge tone="sky">درخواست رزرو</Badge>}
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {!rows.length && <p className="py-16 text-center text-sm text-ink3">متخصصی با این مشخصات پیدا نشد.</p>}
    </>
  );
}
