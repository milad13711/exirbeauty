"use client";
import { useState } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Check, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, fieldCls } from "@/components/ui";
import { MapPinPicker } from "@/components/finder/MapPinPicker";
import { FINDER_CATS, catStyle, type FinderCat } from "@/lib/finder";
import { finderListings, PLAN_INFO, type FinderListing, type ListingStaff } from "@/lib/finderListings";

const statusInfo = {
  pending: { tone: "amber" as const, label: "در انتظار تأیید" },
  published: { tone: "sage" as const, label: "منتشرشده" },
  rejected: { tone: "danger" as const, label: "رد شده" },
};

function LookupForm({ onFound }: { onFound: (l: FinderListing) => void }) {
  const sp = useSearchParams();
  const [id, setId] = useState(sp.get("id") ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  function lookup() {
    const l = finderListings.findByCode(id.trim(), code.trim());
    if (!l) return setErr("شناسه یا کد ویرایش درست نیست.");
    setErr("");
    onFound(l);
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-lg font-extrabold text-ink">ویرایش پروفایل اکسیریاب</h1>
      <p className="mt-1.5 text-xs leading-6 text-ink3">شناسه‌ی پروفایل و کد ویرایشی که هنگام ثبت‌نام دریافت کردید را وارد کنید.</p>
      <div className="mt-4 space-y-3">
        <Field label="شناسه‌ی پروفایل"><input value={id} onChange={(e) => setId(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        <Field label="کد ویرایش"><input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={clsx(fieldCls, "font-mono tracking-widest")} /></Field>
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <Button className="w-full" onClick={lookup}>ورود به ویرایش</Button>
      </div>
    </Card>
  );
}

function EditForm({ listing }: { listing: FinderListing }) {
  const [name, setName] = useState(listing.name);
  const [brand, setBrand] = useState(listing.brand);
  const [phone, setPhone] = useState(listing.phone);
  const [bio, setBio] = useState(listing.bio);
  const [cats, setCats] = useState<FinderCat[]>(listing.cats);
  const [pin, setPin] = useState({ x: listing.x, y: listing.y, city: listing.city });
  const [staff, setStaff] = useState<ListingStaff[]>(listing.staff);
  const [saved, setSaved] = useState(false);
  const isSalon = listing.plan === "salon";

  function toggleCat(c: FinderCat) { setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])); }

  function save() {
    finderListings.update(listing.id, { name: name.trim(), brand: isSalon ? brand.trim() : name.trim(), phone, bio: bio.trim(), cats, x: pin.x, y: pin.y, city: pin.city, staff: isSalon ? staff.filter((s) => s.name.trim() && s.cats.length) : [] });
    setSaved(true);
  }

  if (saved) {
    return (
      <Card className="mx-auto max-w-md p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-sagesoft text-sage"><Check size={28} /></span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">تغییرات ثبت شد</h2>
        <p className="mt-2 text-sm leading-7 text-ink2">پروفایل شما دوباره برای بررسی تیم اکسیر ارسال شد و تا تأیید مجدد، نسخه‌ی قبلی روی نقشه باقی می‌ماند.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-ink3">پلن</p>
            <p className="font-extrabold text-ink">{PLAN_INFO[listing.plan].title}</p>
          </div>
          <Badge tone={statusInfo[listing.status].tone}>{statusInfo[listing.status].label}</Badge>
        </div>
        {listing.status === "rejected" && listing.rejectReason && <p className="mt-3 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">دلیل رد: {listing.rejectReason}</p>}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={isSalon ? "نام مدیر سالن" : "نام و نام خانوادگی"}><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          {isSalon && <Field label="نام سالن"><input value={brand} onChange={(e) => setBrand(e.target.value)} className={fieldCls} /></Field>}
          <Field label="شماره موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">نوع خدمات</p>
          <div className="flex flex-wrap gap-1.5">
            {FINDER_CATS.map((c) => (
              <button key={c} type="button" onClick={() => toggleCat(c)} className={clsx("rounded-full px-3 py-1.5 text-xs font-bold transition-colors", cats.includes(c) ? "bg-[image:var(--grad-rose)] text-white" : clsx(catStyle[c].bg, catStyle[c].fg))}>{c}</button>
            ))}
          </div>
        </div>
        <Field label="بیوگرافی"><textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className={fieldCls} /></Field>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="text-sm font-bold text-ink">موقعیت روی نقشه</h3>
        <MapPinPicker x={pin.x} y={pin.y} onPick={setPin} />
        <p className="text-sm text-ink2">شهر: <b>{pin.city}</b></p>
      </Card>

      {isSalon && (
        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-ink">متخصص‌های سالن</h3>
          {staff.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
              <input value={s.name} onChange={(e) => setStaff((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="نام متخصص" className={clsx(fieldCls, "!w-40")} />
              <div className="flex flex-1 flex-wrap gap-1">
                {FINDER_CATS.map((c) => {
                  const on = s.cats.includes(c);
                  return <button key={c} type="button" onClick={() => setStaff((list) => list.map((x, j) => (j === i ? { ...x, cats: on ? x.cats.filter((y) => y !== c) : [...x.cats, c] } : x)))} className={clsx("rounded-full px-2.5 py-1 text-[11px] font-bold", on ? "bg-[image:var(--grad-rose)] text-white" : clsx(catStyle[c].bg, catStyle[c].fg))}>{c}</button>;
                })}
              </div>
              <button type="button" onClick={() => setStaff((list) => list.filter((_, j) => j !== i))} className="grid size-8 shrink-0 place-items-center rounded-lg text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
            </div>
          ))}
          {staff.length < 10 && <Button variant="ghost" onClick={() => setStaff((list) => [...list, { name: "", cats: [] }])}><Plus size={14} />افزودن متخصص</Button>}
        </Card>
      )}

      <Button className="w-full" onClick={save}>ذخیره و ارسال برای تأیید مجدد</Button>
    </div>
  );
}

export default function ManageFinderPage() {
  const [found, setFound] = useState<FinderListing | null>(null);
  return (
    <div className="page-in">
      <Suspense fallback={null}>
        {found ? <EditForm listing={found} /> : <LookupForm onFound={setFound} />}
      </Suspense>
    </div>
  );
}
