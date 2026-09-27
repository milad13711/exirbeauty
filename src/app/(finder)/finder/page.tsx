"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CalendarCheck, LocateFixed, Loader2, MapPin, Maximize, Minus, Plus, Search, Send, Sparkles, Star, X } from "lucide-react";
import { Avatar, Badge, Button, Card, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import {
  CITIES, FINDER_CATS, IRAN_MAP_VIEWBOX, IRAN_PROVINCES, catStyle, findCity, haversineKm, listFinderPros, nearestCity, reviewsFor, tintFor,
  type FinderCat, type FinderProGeo, type Review,
} from "@/lib/finder";
import { finderListings, useFinderListings } from "@/lib/finderListings";
import { digits } from "@/lib/validate";

const VB_W = 582, VB_H = 528;
const PROS = listFinderPros();
const MIN_ZOOM = 1, MAX_ZOOM = 4;

type MyLoc = { lat: number; lng: number; label: string; x: number; y: number };

function CatChip({ c }: { c: FinderCat }) {
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-bold", catStyle[c].bg, catStyle[c].fg)}>{c}</span>;
}

/** آواتار متخصص‌های فهرست مستقل (بدون اتصال به CRM)؛ عمداً از کامپوننت Avatar مشترک استفاده نمی‌کند
 * چون آن با نام مشتری/پرسنل واقعی تطبیق می‌دهد و ممکن است تصادفاً به یک نام مشابه در دیتابیس گره بخورد. */
function ProAvatar({ pro, size = 40 }: { pro: FinderProGeo; size?: number }) {
  if (pro.onCrm) return <Avatar name={pro.name} size={size} color={catStyle[pro.cats[0]].dot} />;
  const initials = pro.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  const color = catStyle[pro.cats[0]].dot;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-[inset_0_-6px_12px_rgba(0,0,0,.12)]" style={{ width: size, height: size, background: `linear-gradient(145deg, ${color}, ${color}cc)`, fontSize: size * 0.4 }} aria-hidden>
      {initials}
    </span>
  );
}

/* eslint-disable @next/next/no-img-element -- عکس‌های نمونه‌کار data-URL محلی‌اند */
function PortfolioTiles({ pro, count }: { pro: FinderProGeo; count: number }) {
  const photos = pro.photos ?? [];
  return (
    <>
      {Array.from({ length: count }).map((_, i) =>
        photos[i] ? (
          <img key={i} src={photos[i]} alt="نمونه‌کار" className="aspect-square w-full rounded-xl object-cover" />
        ) : (
          <div key={i} className="aspect-square rounded-xl" style={{ background: `linear-gradient(${135 + i * 20}deg, ${pro.tint[0]}, ${pro.tint[1]})` }} />
        ),
      )}
    </>
  );
}

function relDate(daysAgo: number) {
  if (daysAgo < 1) return "امروز";
  if (daysAgo < 7) return `${daysAgo} روز پیش`;
  if (daysAgo < 30) return `${Math.round(daysAgo / 7)} هفته پیش`;
  return `${Math.round(daysAgo / 30)} ماه پیش`;
}

/** فرم درخواست نوبت برای متخصص‌های ثبت‌نامی (پلن هنرمند/سالن) که هنوز به موتور رزرو CRM وصل نیستند. */
function LeadForm({ listingId, name }: { listingId: string; name: string }) {
  const [n, setN] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState(""); const [sent, setSent] = useState(false);
  if (sent) return <p role="status" className="mt-4 rounded-xl bg-sagesoft p-3 text-center text-sm text-sage">درخواست شما ثبت شد؛ {name.split(" ")[0]} برای هماهنگی با شما تماس می‌گیرد.</p>;
  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-line p-3.5">
      <p className="text-xs font-bold text-ink2">درخواست نوبت از {name}</p>
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="نام شما" className={fieldCls} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" style={{ textAlign: "right" }} className={fieldCls} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="خدمت موردنظر یا توضیح (اختیاری)" className={fieldCls} />
      <Button className="w-full" onClick={() => { if (n.trim().length < 2 || !/^09\d{9}$/.test(digits(phone).replace(/\s/g, ""))) return; finderListings.addLead(listingId, { name: n.trim(), phone, note: note.trim(), day: 0 }); setSent(true); }}><Send size={14} />ارسال درخواست نوبت</Button>
    </div>
  );
}

/** ثبت نظر واقعی مشتری برای پروفایل‌های ثبت‌نامی روی اکسیریاب. */
function ReviewForm({ listingId }: { listingId: string }) {
  const [n, setN] = useState(""); const [rating, setRating] = useState(5); const [text, setText] = useState(""); const [sent, setSent] = useState(false);
  if (sent) return <p role="status" className="mt-3 rounded-xl bg-sagesoft p-2.5 text-center text-xs text-sage">ممنون از نظرت! پس از ثبت نمایش داده می‌شود.</p>;
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-line p-3">
      <p className="text-xs font-bold text-ink2">شما هم نظر بدید</p>
      <div className="flex items-center gap-2">
        <input value={n} onChange={(e) => setN(e.target.value)} placeholder="نام شما" className={clsx(fieldCls, "flex-1")} />
        <div className="flex shrink-0 gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => <button key={s} type="button" onClick={() => setRating(s)}><Star size={18} className={s <= rating ? "text-gold" : "text-line"} fill={s <= rating ? "currentColor" : "none"} /></button>)}
        </div>
      </div>
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="تجربه‌تان را بنویسید" className={fieldCls} />
      <Button variant="soft" className="w-full" onClick={() => { if (n.trim().length < 2 || text.trim().length < 3) return; finderListings.addReview(listingId, { name: n.trim(), rating, text: text.trim() }); setSent(true); }}>ثبت نظر</Button>
    </div>
  );
}

/** نقشه با زوم/پن — همه‌ی محتوا (استان‌ها + پین‌ها) داخل یک لایه‌ی transform مشترک قرار می‌گیرند. */
function ZoomableMap({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  function clampPan(p: { x: number; y: number }, s: number) {
    const bound = 130 * (s - 1);
    return { x: Math.max(-bound - 40, Math.min(bound + 40, p.x)), y: Math.max(-bound - 40, Math.min(bound + 40, p.y)) };
  }

  function zoomBy(delta: number) {
    setScale((s) => {
      const n = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(s + delta).toFixed(2)));
      if (n === MIN_ZOOM) setPan({ x: 0, y: 0 });
      else setPan((p) => clampPan(p, n));
      return n;
    });
  }
  function reset() { setScale(1); setPan({ x: 0, y: 0 }); }

  return (
    <div
      className={clsx("relative h-full w-full overflow-hidden touch-none", scale > 1 && "cursor-grab active:cursor-grabbing")}
      onWheel={(e) => { e.preventDefault(); zoomBy(e.deltaY > 0 ? -0.3 : 0.3); }}
      onPointerDown={(e) => { if (scale <= 1) return; (e.target as Element).setPointerCapture(e.pointerId); dragRef.current = { x: e.clientX, y: e.clientY }; }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.x, dy = e.clientY - dragRef.current.y;
        dragRef.current = { x: e.clientX, y: e.clientY };
        setPan((p) => clampPan({ x: p.x + dx, y: p.y + dy }, scale));
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onDoubleClick={() => zoomBy(scale < MAX_ZOOM ? 1 : -MAX_ZOOM)}
    >
      <div className="h-full w-full transition-transform duration-150 ease-out" style={{ transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`, transformOrigin: "center" }}>
        {children}
      </div>
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-[var(--shadow-card)] backdrop-blur">
        <button type="button" onClick={() => zoomBy(0.6)} className="grid size-8 place-items-center rounded-lg text-ink2 hover:bg-surface2" aria-label="بزرگ‌نمایی"><Plus size={16} /></button>
        <button type="button" onClick={() => zoomBy(-0.6)} className="grid size-8 place-items-center rounded-lg text-ink2 hover:bg-surface2" aria-label="کوچک‌نمایی"><Minus size={16} /></button>
        <button type="button" onClick={reset} className="grid size-8 place-items-center rounded-lg text-ink2 hover:bg-surface2" aria-label="بازنشانی زوم"><Maximize size={14} /></button>
      </div>
    </div>
  );
}

export default function FinderPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FinderCat | "all">("all");
  const [city, setCity] = useState<string>("all");
  const [myLoc, setMyLoc] = useState<MyLoc | null>(null);
  const [locState, setLocState] = useState<"idle" | "loading" | "denied">("idle");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  /** متخصص‌هایی که واقعاً از پنل مدیریت اکسیر استفاده می‌کنند (پرسنل فعال این سالن)؛ فقط این‌ها رزرو مستقیم دارند.
   * عمداً مستقل از ماژول اختیاری «مارکت‌پلیس داخلی» است — داشتن پنل مدیریت با روشن بودن آن ماژول یکی نیست. */
  const crmPros = useMemo<FinderProGeo[]>(() => {
    const c = findCity(db.salon.city) ?? CITIES[0];
    const ownWorks = db.posts.filter((x) => x.status === "منتشر شد" && (x.before || x.after)).flatMap((w) => [w.before, w.after].filter(Boolean) as string[]);
    return db.staff.filter((s) => s.active).map((s) => {
      const svcs = db.services.filter((x) => x.active && x.staff.includes(s.id));
      const cats = [...new Set(svcs.map((x) => x.cat))] as FinderCat[];
      const answered = db.surveys.filter((x) => x.staffId === s.id && x.rating);
      const surveyReviews: Review[] = answered.filter((x) => x.route === "public")
        .map((x, i) => ({ name: x.name.split(" ")[0] || "مشتری", rating: x.rating!, text: x.comment || "—", daysAgo: 3 + i * 4 }));
      return {
        id: `crm-${s.id}`, name: s.name, salon: db.salon.name, city: db.salon.city, cats: cats.length ? cats : (["مو"] as FinderCat[]),
        rating: s.rating, reviews: answered.length, from: svcs.length ? Math.min(...svcs.map((x) => x.price)) : 0, bio: s.bio || `${s.role} در ${db.salon.name}`, verified: true,
        x: c.x, y: c.y, lat: c.lat, lng: c.lng, tint: tintFor(cats.length ? cats : (["مو"] as FinderCat[])), portfolio: Math.max(3, Math.min(6, ownWorks.length || 3)),
        reviewList: surveyReviews.length ? surveyReviews : reviewsFor(s.id, s.rating), onCrm: true, staffId: s.id, photos: ownWorks,
      };
    });
  }, [db]);

  /** پروفایل‌های ثبت‌نام‌شده‌ی خودِ متخصص‌ها روی اکسیریاب (پس از تأیید ادمین). پلن سالن هر متخصص را جدا پین می‌کند. */
  const listings = useFinderListings();
  const listingPros = useMemo<FinderProGeo[]>(() => {
    const out: FinderProGeo[] = [];
    for (const l of listings.filter((x) => x.status === "published")) {
      const c = findCity(l.city) ?? CITIES[0];
      const reviewList: Review[] = l.reviews.map((r) => ({ name: r.name, rating: r.rating, text: r.text, daysAgo: Math.max(0, Math.floor((Date.now() - r.at) / 86_400_000)) }));
      const avgRating = reviewList.length ? +(reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length).toFixed(1) : 0;
      const base = {
        city: l.city, x: c.x, y: c.y, lat: c.lat, lng: c.lng, from: 0, verified: l.plan !== "free", rating: avgRating, reviews: reviewList.length,
        reviewList, portfolio: 3, onCrm: false, listingId: l.id, plan: l.plan, phone: l.phone,
      };
      if (l.plan === "salon" && l.staff.length) {
        l.staff.forEach((s, i) => {
          const angle = (i / l.staff.length) * Math.PI * 2, r = 8;
          out.push({ ...base, id: `listing-${l.id}-${i}`, name: s.name, salon: l.brand, cats: s.cats, bio: `متخصص در ${l.brand}`, tint: tintFor(s.cats), x: c.x + Math.cos(angle) * r, y: c.y + Math.sin(angle) * r });
        });
      } else {
        out.push({ ...base, id: `listing-${l.id}`, name: l.plan === "salon" ? l.brand : l.name, salon: l.brand || l.name, cats: l.cats, bio: l.bio, tint: tintFor(l.cats) });
      }
    }
    return out;
  }, [listings]);

  const allPros = useMemo(() => [...crmPros, ...listingPros, ...PROS], [crmPros, listingPros]);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { setLocState("denied"); return; }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const c = nearestCity(latitude, longitude);
        setMyLoc({ lat: latitude, lng: longitude, label: `نزدیک ${c.name}`, x: c.x, y: c.y });
        setCity("all");
        setLocState("idle");
      },
      () => setLocState("denied"),
      { timeout: 8000 },
    );
  }

  function pickCity(name: string) {
    setCity(name);
    if (name === "all") { setMyLoc(null); return; }
    const c = CITIES.find((x) => x.name === name);
    if (c) setMyLoc({ lat: c.lat, lng: c.lng, label: c.name, x: c.x, y: c.y });
  }

  const results = useMemo(() => {
    let list = allPros.filter((p) => {
      if (cat !== "all" && !p.cats.includes(cat)) return false;
      if (city !== "all" && p.city !== city) return false;
      if (q.trim()) {
        const t = q.trim();
        if (!p.name.includes(t) && !p.salon.includes(t) && !p.bio.includes(t) && !p.cats.some((c) => c.includes(t))) return false;
      }
      return true;
    });
    if (myLoc) {
      list = list.map((p) => ({ ...p, dist: haversineKm(myLoc, p) })).sort((a, b) => a.dist - b.dist);
    } else {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }
    return list as (FinderProGeo & { dist?: number })[];
  }, [allPros, q, cat, city, myLoc]);

  const selectedPro = allPros.find((p) => p.id === selected) ?? null;

  return (
    <div className="page-in">
      <div className="mb-5 max-w-2xl">
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink md:text-2xl">نزدیک‌ترین متخصص زیبایی رو پیدا کن</h1>
        <p className="mt-1.5 text-[13px] leading-6 text-ink2">جست‌وجوی متخصص‌های مو، پوست، ناخن، آرایش و... روی نقشه‌ی ایران — بر اساس لوکیشن یا نوع خدمت.</p>
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام متخصص، سالن یا خدمت..." className={clsx(fieldCls, "pr-10")} />
          </div>
          <select value={city} onChange={(e) => pickCity(e.target.value)} className={clsx(fieldCls, "lg:w-44")}>
            <option value="all">همه شهرها</option>
            {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <Button type="button" variant={myLoc && locState !== "loading" ? "soft" : "primary"} onClick={useMyLocation} disabled={locState === "loading"} className="shrink-0">
            {locState === "loading" ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {locState === "loading" ? "در حال یافتن موقعیت..." : "نزدیک‌ترین به من"}
          </Button>
        </div>
        {locState === "denied" && <p className="mt-2.5 text-xs text-danger">دسترسی به موقعیت مکانی رد شد؛ می‌تونی از لیست شهرها انتخاب کنی.</p>}
        {myLoc && locState !== "denied" && <p className="mt-2.5 text-xs text-sage">فاصله‌ها نسبت به «{myLoc.label}» محاسبه شد.</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => setCat("all")} className={clsx("rounded-full px-3 py-1.5 text-xs font-bold transition-colors", cat === "all" ? "bg-[image:var(--grad-rose)] text-white" : "bg-surface2 text-ink2 hover:bg-surface2/70")}>همه خدمات</button>
          {FINDER_CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={clsx("rounded-full px-3 py-1.5 text-xs font-bold transition-colors", cat === c ? "bg-[image:var(--grad-rose)] text-white" : clsx(catStyle[c].bg, catStyle[c].fg))}>{c}</button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="relative w-full bg-surface2" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
            <ZoomableMap>
              <svg viewBox={IRAN_MAP_VIEWBOX} className="absolute inset-0 h-full w-full">
                {IRAN_PROVINCES.map((p) => (
                  <path key={p.name} d={p.d} className="fill-surface stroke-line" strokeWidth={1} />
                ))}
              </svg>
              {results.map((p) => {
                const active = hovered === p.id || selected === p.id;
                return (
                  <button
                    key={p.id}
                    onMouseEnter={() => setHovered(p.id)}
                    onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
                    onClick={() => setSelected(p.id)}
                    style={{ left: `${(p.x / VB_W) * 100}%`, top: `${(p.y / VB_H) * 100}%` }}
                    className={clsx("absolute -translate-x-1/2 -translate-y-full transition-transform", active && "z-10 scale-125")}
                    title={p.name}
                  >
                    {p.onCrm && <span className="absolute -inset-1.5 -z-10 rounded-full bg-sage/25 ring-2 ring-sage" />}
                    {!p.onCrm && p.listingId && p.plan !== "free" && <span className="absolute -inset-1.5 -z-10 rounded-full bg-sky/25 ring-2 ring-sky" />}
                    <MapPin size={active ? 26 : 20} fill={catStyle[p.cats[0]].dot} className="drop-shadow-md" style={{ color: catStyle[p.cats[0]].dot }} />
                  </button>
                );
              })}
              {myLoc && (
                <div style={{ left: `${(myLoc.x / VB_W) * 100}%`, top: `${(myLoc.y / VB_H) * 100}%` }} className="absolute -translate-x-1/2 -translate-y-1/2">
                  <span className="block size-3.5 rounded-full bg-sky ring-4 ring-sky/25" />
                </div>
              )}
            </ZoomableMap>
          </div>
        </Card>

        <div className="flex max-h-[560px] flex-col gap-2.5 overflow-y-auto lg:col-span-2">
          {results.length === 0 && <Card className="p-6 text-center text-sm text-ink3">متخصصی با این فیلتر پیدا نشد.</Card>}
          {results.map((p) => (
            <Card
              key={p.id}
              className={clsx("cursor-pointer p-3.5 transition-shadow", (hovered === p.id || selected === p.id) && "shadow-[var(--shadow-pop)]")}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered((h) => (h === p.id ? null : h))}
              onClick={() => setSelected(p.id)}
            >
              <div className="flex items-start gap-2.5">
                <ProAvatar pro={p} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[13.5px] font-extrabold text-ink">{p.name}</p>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gold"><Star size={13} fill="currentColor" />{p.rating}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink3">{p.salon} · {p.city}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {p.cats.map((c) => <CatChip key={c} c={c} />)}
                {"dist" in p && p.dist !== undefined && <Badge tone="sky">{p.dist < 1 ? "کمتر از ۱ کیلومتر" : `${Math.round(p.dist)} کیلومتر`}</Badge>}
                {p.onCrm && <Badge tone="sage"><CalendarCheck size={11} />رزرو مستقیم</Badge>}
                {!p.onCrm && p.listingId && p.plan !== "free" && <Badge tone="sky">پلن {p.plan === "salon" ? "سالن" : "هنرمند"}</Badge>}
                {p.listingId && p.plan === "free" && <Badge tone="neutral">عضو اکسیریاب</Badge>}
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                <PortfolioTiles pro={p} count={Math.min(4, p.portfolio)} />
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="text-xs text-ink3">از {p.from.toLocaleString("fa-IR")} تومان · {p.reviews} نظر</p>
                {p.onCrm && (
                  <Link href={`/book?staff=${p.staffId}`} onClick={(e) => e.stopPropagation()} className="shrink-0 rounded-full bg-[image:var(--grad-rose)] px-3 py-1.5 text-[11px] font-bold text-white">رزرو نوبت</Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-5 flex flex-col items-center justify-between gap-3 p-5 text-center sm:flex-row sm:text-right">
        <div>
          <p className="text-[14px] font-extrabold text-ink">متخصص زیبایی هستید؟</p>
          <p className="mt-1 text-xs leading-6 text-ink3">لوکیشن دقیقت رو مثل گوگل‌مپ روی نقشه پین کن، پروفایل بساز و مشتری جدید پیدا کن.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/finder/manage" className="press rounded-[14px] border border-line bg-surface px-4 py-2.5 text-[13px] font-bold text-ink2">ویرایش پروفایل من</Link>
          <Link href="/finder/join" className="press flex items-center gap-1.5 rounded-[14px] bg-[image:var(--grad-rose)] px-4 py-2.5 text-[13px] font-bold text-white"><Sparkles size={15} />ثبت‌نام رایگان</Link>
        </div>
      </Card>

      {selectedPro && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-surface p-5 shadow-[var(--shadow-pop)] sm:rounded-[22px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProAvatar pro={selectedPro} size={52} />
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-extrabold text-ink">{selectedPro.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink3">{selectedPro.salon} · {selectedPro.city}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink3 hover:bg-surface2"><X size={16} /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedPro.cats.map((c) => <CatChip key={c} c={c} />)}
              {selectedPro.verified && <Badge tone="sage">تأیید شده</Badge>}
              {selectedPro.onCrm && <Badge tone="sage"><CalendarCheck size={11} />دارای پنل مدیریت اکسیر</Badge>}
              {selectedPro.listingId && selectedPro.plan && selectedPro.plan !== "free" && <Badge tone="sky">پلن {selectedPro.plan === "salon" ? "سالن" : "هنرمند"}</Badge>}
            </div>
            <p className="mt-3 text-[13px] leading-6 text-ink2">{selectedPro.bio}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-ink3">
              <span className="flex items-center gap-1 font-bold text-gold"><Star size={13} fill="currentColor" />{selectedPro.rating} ({selectedPro.reviews} نظر)</span>
              <span>از {selectedPro.from.toLocaleString("fa-IR")} تومان</span>
            </div>

            <p className="mb-2 mt-5 text-xs font-bold text-ink2">نمونه‌کارها</p>
            <div className="grid grid-cols-4 gap-2">
              <PortfolioTiles pro={selectedPro} count={selectedPro.portfolio} />
            </div>

            <p className="mb-2 mt-5 text-xs font-bold text-ink2">چند نظر اخیر مشتری‌ها</p>
            {selectedPro.reviewList.length ? (
              <ul className="-mx-1 divide-y divide-line">
                {selectedPro.reviewList.map((r, i) => (
                  <li key={i} className="px-1 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <b className="text-ink">{r.name}</b>
                      <span className="flex items-center gap-1 text-xs text-ink3">{relDate(r.daysAgo)}</span>
                    </div>
                    <span className="text-gold text-xs">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></span>
                    <p className="mt-0.5 text-[13px] leading-6 text-ink2">{r.text}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-ink3">هنوز نظری برای این پروفایل ثبت نشده است.</p>}
            {selectedPro.listingId && <ReviewForm listingId={selectedPro.listingId} />}

            {selectedPro.onCrm ? (
              <>
                <Badge tone="sage" className="mt-4">این متخصص روی پنل مدیریت اکسیر است؛ نوبت شما مستقیم برای تأیید ارسال می‌شود</Badge>
                <Link href={`/book?staff=${selectedPro.staffId}`} className="press mt-3 block rounded-[14px] bg-[image:var(--grad-rose)] py-3 text-center text-[13.5px] font-bold text-white">رزرو نوبت از {selectedPro.name.split(" ")[0]}</Link>
              </>
            ) : selectedPro.listingId && selectedPro.plan !== "free" ? (
              <LeadForm listingId={selectedPro.listingId} name={selectedPro.name} />
            ) : selectedPro.listingId ? (
              <>
                <Badge tone="sky" className="mt-4">این پروفایل رایگان است و رزرو مستقیم ندارد؛ برای هماهنگی مستقیم تماس بگیرید</Badge>
                <a href={`tel:${digits(selectedPro.phone ?? "")}`} className="press mt-3 block rounded-[14px] border border-line bg-surface py-3 text-center text-[13.5px] font-bold text-ink"><bdi dir="ltr">{selectedPro.phone}</bdi></a>
              </>
            ) : (
              <>
                <Badge tone="amber" className="mt-4">این متخصص هنوز به پنل مدیریت اکسیر متصل نیست؛ رزرو مستقیم به‌زودی فعال می‌شود</Badge>
                <Button className="mt-3 w-full" disabled>رزرو نوبت (به‌زودی)</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
