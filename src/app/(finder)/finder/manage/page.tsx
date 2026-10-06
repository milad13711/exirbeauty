"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Check, ExternalLink, Plus, Rocket, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, fieldCls } from "@/components/ui";
import { MapPinPicker } from "@/components/finder/MapPinPicker";
import { FINDER_CATS, catStyle, type FinderCat } from "@/lib/finder";
import { faDate, toman } from "@/lib/fmt";
import { PLAN_INFO, errorText, finderApi, type ListingInput, type ListingStaff, type OwnerView } from "@/lib/finderApi";

const statusInfo = {
  PENDING: { tone: "amber" as const, label: "در انتظار تأیید" },
  PUBLISHED: { tone: "sage" as const, label: "منتشرشده" },
  REJECTED: { tone: "danger" as const, label: "رد شده" },
};

function LookupForm({ onFound }: { onFound: (l: OwnerView, code: string) => void }) {
  const sp = useSearchParams();
  const [id, setId] = useState(sp.get("id") ?? "");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setBusy(true); setErr("");
    try { onFound(await finderApi.manage(id.trim(), code), code); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-lg font-extrabold text-ink">ویرایش پروفایل اکسیریاب</h1>
      <p className="mt-1.5 text-xs leading-6 text-ink3">شناسه‌ی پروفایل و کد ویرایشی که هنگام ثبت‌نام دریافت کردید را وارد کنید.</p>
      <div className="mt-4 space-y-3">
        <Field label="شناسه‌ی پروفایل"><input value={id} onChange={(e) => setId(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
        <Field label="کد ویرایش"><input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={clsx(fieldCls, "font-mono tracking-widest")} /></Field>
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <Button className="w-full" onClick={lookup} disabled={busy || !id.trim() || !code.trim()}>{busy ? "در حال بررسی…" : "ورود به ویرایش"}</Button>
      </div>
    </Card>
  );
}

function PlanCard({ listing, code }: { listing: OwnerView; code: string }) {
  const [months, setMonths] = useState(1);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const { salon, activation } = listing;

  if (salon) {
    return (
      <Card className="space-y-2 p-5">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-ink">پنل مدیریت فعال است</h3><Badge tone={salon.active ? "sage" : "danger"}>{salon.active ? "فعال" : "اشتراک منقضی"}</Badge></div>
        {salon.expiresAt && <p className="text-xs text-ink3">اعتبار تا {faDate.full(salon.expiresAt.slice(0, 10))}</p>}
        <p className="text-sm leading-7 text-ink2">با شماره‌ی موبایل ثبت‌نام و کد پیامکی وارد پنل شوید؛ خدمات، پرسنل، نوبت و صندوق از همان‌جا مدیریت می‌شود (متخصص‌های نقشه هم از پنل می‌آیند).</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href="/login" className="press inline-flex items-center gap-1.5 rounded-[14px] bg-[image:var(--grad-rose)] px-4 py-2 text-[13px] font-bold text-white"><ExternalLink size={14} />ورود به پنل</a>
          {listing.planLimits.directBooking && <a href={`/s/${salon.slug}`} className="press inline-flex items-center gap-1.5 rounded-[14px] border border-line px-4 py-2 text-[13px] font-bold text-ink2">صفحه‌ی رزرو آنلاین</a>}
        </div>
      </Card>
    );
  }
  if (!activation.available) {
    return activation.reason === "NOT_PUBLISHED"
      ? <Card className="p-5"><p className="text-sm leading-7 text-ink2">پس از تأیید و انتشار پروفایل توسط تیم اکسیر، می‌توانید با پرداخت هزینه‌ی پلن، پنل مدیریت را فعال کنید.</p></Card>
      : null;
  }
  async function pay() {
    setBusy(true); setErr("");
    try { const r = await finderApi.activate(listing.id, code, months); window.location.href = r.paymentUrl; } catch (e) { setErr(errorText(e)); setBusy(false); }
  }
  return (
    <Card className="space-y-3 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink"><Rocket size={15} className="text-rose" />فعال‌سازی پنل مدیریت ({PLAN_INFO[listing.plan].title})</h3>
      <ul className="space-y-1 text-xs leading-6 text-ink2">{PLAN_INFO[listing.plan].features.map((f) => <li key={f}>• {f}</li>)}</ul>
      <div className="flex flex-wrap items-center gap-2">{[1, 3, 6, 12].map((m) => <button key={m} type="button" onClick={() => setMonths(m)} className={clsx("rounded-full border px-3 py-1.5 text-xs font-bold", months === m ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line text-ink2")}>{m} ماه</button>)}</div>
      <p className="text-sm text-ink2">مبلغ قابل پرداخت: <b className="text-ink">{toman(activation.priceMonthly * months)}</b></p>
      {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
      <Button onClick={pay} disabled={busy}>{busy ? "در حال انتقال به درگاه…" : "پرداخت و فعال‌سازی"}</Button>
      <p className="text-[11px] leading-5 text-ink3">با موفقیت پرداخت، یک پنل مخصوص شما ساخته می‌شود و با همین شماره‌ی موبایل می‌توانید وارد شوید.</p>
    </Card>
  );
}

function EditForm({ listing, code }: { listing: OwnerView; code: string }) {
  // A previously submitted change that is still waiting for approval is what the owner expects to see.
  const base: ListingInput = listing.pendingEdit ?? listing;
  const [name, setName] = useState(base.name);
  const [brand, setBrand] = useState(base.brand ?? base.name);
  const [phone, setPhone] = useState(base.phone);
  const [bio, setBio] = useState(base.bio);
  const [cats, setCats] = useState<FinderCat[]>(base.cats);
  const [pin, setPin] = useState({ x: base.x, y: base.y, city: base.city });
  const [staff, setStaff] = useState<ListingStaff[]>(base.staff ?? []);
  const [result, setResult] = useState<{ pendingEdit: boolean } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const isSalon = listing.plan === "salon";
  const maxStaff = listing.planLimits.staff ?? 1;

  function toggleCat(c: FinderCat) { setCats((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])); }

  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await finderApi.edit(listing.id, code, {
        name: name.trim(), brand: isSalon ? brand.trim() : undefined, phone, bio: bio.trim(), cats, x: pin.x, y: pin.y, city: pin.city,
        staff: isSalon ? staff.filter((s) => s.name.trim() && s.cats.length) : [],
      });
      setResult(r);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-md p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-sagesoft text-sage"><Check size={28} /></span>
        <h2 className="mt-4 text-lg font-extrabold text-ink">تغییرات ثبت شد</h2>
        <p className="mt-2 text-sm leading-7 text-ink2">
          {result.pendingEdit ? "تغییرات برای بررسی تیم اکسیر ارسال شد؛ تا تأیید، نسخه‌ی فعلی روی نقشه باقی می‌ماند." : "پروفایل شما برای بررسی تیم اکسیر ارسال شد و پس از تأیید منتشر می‌شود."}
        </p>
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
          <div className="flex items-center gap-1.5">
            {listing.pendingEdit && <Badge tone="amber">تغییر در انتظار تأیید</Badge>}
            <Badge tone={statusInfo[listing.status].tone}>{statusInfo[listing.status].label}</Badge>
          </div>
        </div>
        {listing.status === "REJECTED" && listing.rejectReason && <p className="mt-3 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">دلیل رد: {listing.rejectReason}</p>}
      </Card>

      <PlanCard listing={listing} code={code} />

      {listing.planLimits.leads && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-bold text-ink">درخواست‌های نوبت دریافتی ({listing.leads.length})</h3>
          {listing.leads.length === 0 ? <p className="text-xs text-ink3">هنوز درخواستی نرسیده است.</p> : (
            <ul className="divide-y divide-line">
              {listing.leads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span><b>{l.name}</b>{l.note && <span className="mr-2 text-xs text-ink3">{l.note}</span>}</span>
                  <a href={`tel:${l.phone}`} className="text-xs font-bold text-rosedeep"><bdi dir="ltr">{l.phone}</bdi></a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

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

      {isSalon && listing.salon && <Card className="p-5"><p className="text-sm leading-7 text-ink2">متخصص‌های سالن حالا از داخل پنل مدیریت (بخش «پرسنل») ویرایش می‌شوند.</p></Card>}
      {isSalon && !listing.salon && (
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
          {staff.length < maxStaff && <Button variant="ghost" onClick={() => setStaff((list) => [...list, { name: "", cats: [] }])}><Plus size={14} />افزودن متخصص</Button>}
        </Card>
      )}

      {err && <p role="alert" className="rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
      <Button className="w-full" onClick={save} disabled={busy}>{busy ? "در حال ارسال…" : "ذخیره و ارسال برای تأیید"}</Button>
    </div>
  );
}

export default function ManageFinderPage() {
  const [found, setFound] = useState<{ listing: OwnerView; code: string } | null>(null);
  return (
    <div className="page-in">
      <Suspense fallback={null}>
        {found ? <EditForm listing={found.listing} code={found.code} /> : <LookupForm onFound={(listing, code) => setFound({ listing, code })} />}
      </Suspense>
    </div>
  );
}
