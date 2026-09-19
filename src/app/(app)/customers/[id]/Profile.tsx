"use client";
/* eslint-disable @next/next/no-img-element -- عکس‌ها data-URL محلی‌اند و بهینه‌سازی next/image لازم ندارند */
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Cake, CalendarClock, Camera, Crown, Droplets, Gift, Hand, Pencil, Phone, Plus, Scissors, Share2, ShieldPlus, Sparkles, StickyNote, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, LinkButton, fieldCls, tierTone } from "@/components/ui";
import { catColor } from "@/lib/mock";
import { actions, useDB, type Customer, type LogEntry } from "@/lib/db";
import { uid } from "@/lib/factories";
import { fileToDataUrl } from "@/lib/image";
import { fa, num, short, toman } from "@/lib/fa";

const tabs = ["نمای کلی", "پرونده زیبایی", "سوابق خدمات", "خریدها"] as const;
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Row({ k, v }: { k: string; v?: string }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="shrink-0 text-ink3">{k}</dt><dd className={clsx("text-left font-medium", v ? "text-ink" : "text-ink3")}>{v || "ثبت نشده"}</dd></div>;
}

function Photos({ e }: { e: LogEntry }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(["قبل", "بعد"] as const).map((t, i) => {
        const src = i ? e.after : e.before;
        return (
          <div key={t} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line" style={!src ? { background: i ? "linear-gradient(160deg,#f7e4ea,#f6ecd6)" : "linear-gradient(160deg,#efe6df,#e6d9cf)" } : undefined}>
            {src ? <img src={src} alt={`${t} از ${e.s}`} className="size-full object-cover" /> : <span className="grid size-full place-items-center"><Camera className="text-ink3" size={22} /></span>}
            <span className="absolute bottom-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-ink2">{t}</span>
          </div>
        );
      })}
    </div>
  );
}

function LogRow({ l, bare }: { l: LogEntry; bare?: boolean }) {
  const cc = catColor[l.cat];
  return (
    <div className={clsx("flex items-center gap-3", !bare && "px-5 py-3")}>
      <span className={clsx("grid size-9 place-items-center rounded-xl text-xs font-bold", cc.bg, cc.fg)}>{l.cat}</span>
      <div className="flex-1"><p className="text-sm font-semibold">{l.s}</p><p className="text-xs text-ink3">{l.d} · {l.by}</p></div>
      <span className="text-sm font-semibold">{short(l.price)}</span>
    </div>
  );
}

/** ویرایش درجای یکی از بخش‌های پرونده‌ی زیبایی */
function BeautyCard({ c, kind }: { c: Customer; kind: "hair" | "skin" | "nail" }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState<Record<string, string>>({});
  const meta = {
    hair: { title: "مو", icon: <Scissors size={17} className="text-rose" />, fields: [["current", "رنگ فعلی"], ["type", "نوع مو"], ["state", "وضعیت مو"], ["brand", "برند مصرفی"], ["oxidant", "اکسیدان"], ["lastColor", "تاریخ آخرین رنگ"], ["formula", "فرمول رنگ (آخرین)"]], multi: ["history", "رنگ‌های قبلی (هر مورد در یک خط)"] },
    skin: { title: "پوست", icon: <Droplets size={17} className="text-sage" />, fields: [["type", "نوع پوست"], ["used", "محصولات استفاده‌شده"], ["allergies", "حساسیت‌ها"]], multi: ["facials", "سوابق فیشال (هر مورد در یک خط)"] },
    nail: { title: "ناخن", icon: <Hand size={17} className="text-gold" />, fields: [["services", "نوع خدمات"], ["colors", "رنگ‌های موردعلاقه"], ["allergies", "حساسیت‌ها"]], multi: null },
  }[kind];
  const cur = c[kind] as unknown as Record<string, string | string[]>;
  const open = () => { const x: Record<string, string> = {}; meta.fields.forEach(([k]) => (x[k] = String(cur[k] ?? ""))); if (meta.multi) x[meta.multi[0]] = ((cur[meta.multi[0]] as string[]) ?? []).join("\n"); setD(x); setEdit(true); };
  const save = () => {
    const next: Record<string, unknown> = { ...cur };
    meta.fields.forEach(([k]) => (next[k] = (d[k] ?? "").trim()));
    if (meta.multi) next[meta.multi[0]] = lines(d[meta.multi[0]] ?? "");
    actions.saveCustomer({ ...c, [kind]: next } as Customer);
    setEdit(false);
  };
  return (
    <Card>
      <CardHead title={meta.title} action={<span className="flex items-center gap-2">{meta.icon}{!edit && <button onClick={open} aria-label={`ویرایش ${meta.title}`} className="cursor-pointer rounded-lg p-1.5 text-ink3 hover:bg-surface2"><Pencil size={15} /></button>}</span>} />
      {edit ? (
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          {meta.fields.map(([k, l]) => <Field key={k} label={l}><input value={d[k] ?? ""} onChange={(e) => setD({ ...d, [k]: e.target.value })} className={fieldCls} /></Field>)}
          {meta.multi && <div className="sm:col-span-2"><Field label={meta.multi[1]}><textarea rows={3} value={d[meta.multi[0]] ?? ""} onChange={(e) => setD({ ...d, [meta.multi![0]]: e.target.value })} className={fieldCls} /></Field></div>}
          <div className="flex gap-2 sm:col-span-2"><Button type="submit">ذخیره</Button><Button type="button" variant="ghost" onClick={() => setEdit(false)}>انصراف</Button></div>
        </form>
      ) : (
        <dl className="divide-y divide-line px-5 pb-3">
          {meta.fields.map(([k, l]) => <Row key={k} k={l} v={String(cur[k] ?? "")} />)}
          {meta.multi && <Row k={meta.multi[1].split(" (")[0]} v={((cur[meta.multi[0]] as string[]) ?? []).join("، ")} />}
        </dl>
      )}
    </Card>
  );
}

function LogForm({ c, onDone }: { c: Customer; onDone: () => void }) {
  const db = useDB();
  const first = db.services.find((s) => s.active) ?? db.services[0];
  const [svcId, setSvcId] = useState(first?.id ?? "");
  const svc = db.services.find((s) => s.id === svcId);
  const [by, setBy] = useState(c.favStaff || db.staff[0]?.name || "");
  const [price, setPrice] = useState(first?.price ?? 0);
  const [before, setBefore] = useState<string>();
  const [after, setAfter] = useState<string>();
  const [err, setErr] = useState("");
  const pick = async (f: File | undefined, set: (v: string) => void) => { if (!f) return; try { set(await fileToDataUrl(f)); setErr(""); } catch (e) { setErr((e as Error).message); } };
  const submit = () => {
    if (!svc) return setErr("خدمتی انتخاب نشده است.");
    if (price <= 0) return setErr("مبلغ را وارد کنید.");
    actions.addLog(c.id, { id: uid("l"), d: "۲۸ شهریور", s: svc.name, by, cat: svc.cat, price, photos: !!(before || after), before, after });
    onDone();
  };
  return (
    <div className="space-y-3 border-b border-line px-5 pb-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="خدمت"><select value={svcId} onChange={(e) => { setSvcId(e.target.value); setPrice(db.services.find((s) => s.id === e.target.value)?.price ?? 0); }} className={fieldCls}>{db.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="متخصص"><select value={by} onChange={(e) => setBy(e.target.value)} className={fieldCls}>{db.staff.map((s) => <option key={s.id}>{s.name}</option>)}</select></Field>
        <Field label="مبلغ (تومان)"><input type="number" min={0} step={10000} value={price} onChange={(e) => setPrice(+e.target.value || 0)} className={fieldCls} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["عکس قبل", before, setBefore], ["عکس بعد", after, setAfter]] as const).map(([l, v, set]) => (
          <label key={l} className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm">
            {v ? <img src={v} alt={l} className="size-14 rounded-lg object-cover" /> : <span className="grid size-14 place-items-center rounded-lg bg-surface2 text-ink3"><Camera size={20} /></span>}
            <span className="min-w-0 flex-1"><b className="block">{l}</b><span className="text-xs text-ink3">{v ? "برای تغییر دوباره انتخاب کنید" : "انتخاب از گالری یا دوربین"}</span></span>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0], set)} />
          </label>
        ))}
      </div>
      {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
      <div className="flex gap-2"><Button onClick={submit}>ثبت خدمت</Button><Button variant="ghost" onClick={onDone}>انصراف</Button></div>
    </div>
  );
}

export function Profile({ id }: { id: string }) {
  const db = useDB();
  const c = db.customers.find((x) => x.id === id);
  const [tab, setTab] = useState<(typeof tabs)[number]>("نمای کلی");
  const [addLog, setAddLog] = useState(false);
  const [noteEdit, setNoteEdit] = useState<string | null>(null);
  const [prod, setProd] = useState("");
  if (!c) return <div className="py-20 text-center text-ink2">مشتری پیدا نشد. <Link href="/customers" className="font-bold text-rose">بازگشت به لیست</Link></div>;

  const pct = Math.round((c.points / (c.points + c.nextRewardIn)) * 100);
  const hasAlert = c.allergies.length > 0 || c.note;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-l from-rosesoft via-goldsoft to-rosesoft" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <div className="-mt-10 rounded-full border-4 border-surface"><Avatar name={c.name} size={80} /></div>
          <div className="min-w-0 flex-1 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold">{c.name}</h1>
              <Badge tone={tierTone[c.tier]}><Crown size={11} />{c.tier}</Badge>
              {c.tags.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-ink2">
              <span className="inline-flex items-center gap-1"><Phone size={13} /><bdi dir="ltr">{c.phone}</bdi></span>
              {c.birth && <span className="inline-flex items-center gap-1"><Cake size={13} />{c.birth}{c.age ? ` (${fa(c.age)} ساله)` : ""}</span>}
              <span>{c.gender}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2"><LinkButton href={`/customers/${c.id}/edit`} variant="ghost"><Pencil size={14} />ویرایش</LinkButton><LinkButton href="/calendar/new"><CalendarClock size={14} />ثبت نوبت</LinkButton></div>
        </div>
      </Card>

      {hasAlert ? (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-dangersoft px-5 py-3.5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={18} />
          <div className="min-w-0 flex-1 text-sm">
            {c.allergies.length > 0 && <p><b className="text-danger">حساسیت‌ها و نکات مهم: </b><span className="text-ink">{c.allergies.join(" · ")}</span></p>}
            {c.note && <p className="mt-1 text-ink2">{c.note}</p>}
          </div>
        </div>
      ) : (
        <Link href={`/customers/${c.id}/edit`} className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-5 py-3 text-sm text-ink2 hover:bg-surface2"><ShieldPlus size={18} className="text-ink3" />حساسیتی ثبت نشده است. برای ایمنی، حساسیت‌ها و نکات مهم را اضافه کنید.</Link>
      )}

      {c.cycleDays > 0 && c.nextDue && (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-rose/25 bg-rosesoft px-5 py-3.5">
          <Sparkles className="text-rose" size={20} />
          <p className="min-w-0 flex-1 basis-56 text-sm text-ink"><b>زمان احتمالی مراجعه بعدی: {c.nextDue}</b> — چرخه‌ی معمول ایشان {fa(c.cycleDays)} روز است ({fa(c.lastVisitDays)} روز گذشته).</p>
          <Button>ارسال پیشنهاد نوبت</Button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["تعداد مراجعات", fa(c.visits)], ["مجموع خرید", c.total ? short(c.total) : "—"], ["میانگین فاکتور", c.avg ? short(c.avg) : "—"], ["آخرین مراجعه", c.lastVisit]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-ink2">{l}</p><p className="mt-1.5 text-xl font-extrabold">{v}</p></Card>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 border-b border-line sm:flex" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors", tab === t ? "border-rose text-rosedeep" : "border-transparent text-ink2 hover:text-ink")}>{t}</button>)}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {tab === "نمای کلی" && (
            <>
              <Card>
                <CardHead title="ترجیحات" />
                <dl className="divide-y divide-line px-5 pb-3">
                  <Row k="خدمت موردعلاقه" v={c.favService} /><Row k="متخصص موردعلاقه" v={c.favStaff} />
                  {c.occasions.map((o) => <Row key={o} k="مناسبت" v={o} />)}
                </dl>
              </Card>
              <Card><CardHead title="محصولات خریداری‌شده" /><ul className="flex flex-wrap gap-2 px-5 pb-5">{c.products.length ? c.products.map((p) => <Badge key={p} tone="gold">{p}</Badge>) : <li className="text-sm text-ink3">هنوز خریدی ثبت نشده است.</li>}</ul></Card>
              <Card><CardHead title="آخرین خدمات" /><ul className="divide-y divide-line">{c.log.slice(0, 3).map((l) => <li key={l.id}><LogRow l={l} /></li>)}{!c.log.length && <li className="px-5 pb-5 text-sm text-ink3">هنوز خدمتی ثبت نشده است.</li>}</ul></Card>
            </>
          )}
          {tab === "پرونده زیبایی" && (<><BeautyCard c={c} kind="hair" /><BeautyCard c={c} kind="skin" /><BeautyCard c={c} kind="nail" /></>)}
          {tab === "سوابق خدمات" && (
            <Card>
              <CardHead title="قبل → خدمت → بعد" hint="هر ویزیت با عکس و مشخصات" action={!addLog && <Button variant="soft" onClick={() => setAddLog(true)}><Plus size={14} />ثبت خدمت</Button>} />
              {addLog && <LogForm c={c} onDone={() => setAddLog(false)} />}
              <ul className="divide-y divide-line">
                {c.log.map((l) => (
                  <li key={l.id} className="px-5 py-4"><LogRow l={l} bare />{(l.photos || l.before || l.after) && <div className="mx-auto mt-3 max-w-xs"><Photos e={l} /></div>}</li>
                ))}
                {!c.log.length && !addLog && <li className="px-5 pb-5 text-sm text-ink3">سابقه‌ای ثبت نشده است.</li>}
              </ul>
            </Card>
          )}
          {tab === "خریدها" && (
            <Card>
              <CardHead title="محصولات خریداری‌شده" />
              <ul className="divide-y divide-line">{c.products.map((p) => <li key={p} className="flex items-center justify-between px-5 py-3 text-sm">{p}<Button variant="soft">خرید مجدد</Button></li>)}</ul>
              <form onSubmit={(e) => { e.preventDefault(); if (prod.trim()) { actions.saveCustomer({ ...c, products: [...c.products, prod.trim()] }); setProd(""); } }} className="flex gap-2 p-5"><input value={prod} onChange={(e) => setProd(e.target.value)} aria-label="محصول جدید" placeholder="افزودن محصول خریداری‌شده…" className={fieldCls} /><Button type="submit" variant="ghost">افزودن</Button></form>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-plum px-5 py-4 text-white">
              <p className="text-xs text-white/70">مزایای من در این سالن</p>
              <p className="mt-1 text-3xl font-extrabold">{num(c.points)} <span className="text-sm font-medium text-white/70">امتیاز</span></p>
              <div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1.5 text-xs text-white/70">{fa(c.nextRewardIn)} امتیاز تا جایزه‌ی بعدی</p>
            </div>
            <dl className="divide-y divide-line px-5 py-2">
              <Row k="سطح" v={c.tier} />
              <div className="flex items-center justify-between py-2 text-sm"><dt className="inline-flex items-center gap-1.5 text-ink3"><Wallet size={14} />کیف پول</dt><dd className="font-semibold">{toman(c.wallet)}</dd></div>
              <div className="flex items-center justify-between py-2 text-sm"><dt className="inline-flex items-center gap-1.5 text-ink3"><Share2 size={14} />معرفی‌شده‌ها</dt><dd className="font-semibold">{fa(c.referrals)} نفر</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHead title="یادداشت متخصص" action={<StickyNote size={16} className="text-ink3" />} />
            <div className="px-5 pb-5">
              {noteEdit === null ? (
                <>
                  <p className="rounded-xl bg-goldsoft p-3 text-sm leading-7 text-ink">{c.note ? `«${c.note}»` : "یادداشتی ثبت نشده است."}</p>
                  <Button variant="ghost" className="mt-3 w-full" onClick={() => setNoteEdit(c.note)}>{c.note ? "ویرایش یادداشت" : "+ افزودن یادداشت"}</Button>
                </>
              ) : (
                <div className="space-y-2"><textarea aria-label="یادداشت" rows={4} value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} className={fieldCls} /><div className="flex gap-2"><Button onClick={() => { actions.saveCustomer({ ...c, note: noteEdit.trim() }); setNoteEdit(null); }}>ذخیره</Button><Button variant="ghost" onClick={() => setNoteEdit(null)}>انصراف</Button></div></div>
              )}
            </div>
          </Card>
          {c.birth && <Card className="flex items-center gap-3 p-4"><Gift className="text-rose" /><p className="text-sm text-ink2">تولد <b className="text-ink">{c.birth.replace(/ \d{4}$/, "")}</b>؛ هدیه‌ی تولد به‌صورت خودکار ارسال می‌شود.</p></Card>}
        </aside>
      </div>
    </>
  );
}
