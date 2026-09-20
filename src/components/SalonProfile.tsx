"use client";
import { useRef, useState } from "react";
import clsx from "clsx";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { PhotoPicker } from "./PhotoPicker";
import { Button, Card, CardHead, Field, fieldCls } from "./ui";
import { actions, useDB, type SalonProfile as Profile } from "@/lib/db";
import { brandOf, readLogo, readPhoto } from "@/lib/theme";
import { isPhone } from "@/lib/validate";
import { fa } from "@/lib/fa";

const empty: Profile = { about: "", instagram: "", website: "", telegram: "", mapUrl: "", tags: [] };
const tagOpts = ["مو", "رنگ و مش", "کراتین", "پوست", "ناخن", "آرایش عروس", "میکاپ", "لیزر", "ماساژ", "مراقبت مردانه"];
const cleanHandle = (s: string) => s.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(instagram\.com|t\.me)\//, "");

/** تکمیل پروفایل سالن: لوگو، کاور، معرفی، شبکه‌های اجتماعی، تخصص‌ها، آدرس و نقشه */
export function SalonProfile() {
  const db = useDB();
  const [info, setInfo] = useState({ name: db.salon.name, phone: db.salon.phone, city: db.salon.city, address: db.salon.address });
  const [p, setP] = useState<Profile>({ ...empty, ...db.salon.profile });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const cover = useRef<HTMLInputElement>(null);
  const brand = brandOf(db.salon);
  const logo = useRef<HTMLInputElement>(null);

  const saved_ = db.salon.profile ?? empty;
  const checks = [
    { l: "لوگو", ok: !!brand.logo }, { l: "عکس کاور", ok: !!saved_.cover }, { l: "معرفی سالن (حداقل ۳۰ حرف)", ok: saved_.about.trim().length >= 30 },
    { l: "آدرس و شماره تماس", ok: !!db.salon.address.trim() && !!db.salon.phone.trim() }, { l: "اینستاگرام یا سایت", ok: !!(saved_.instagram || saved_.website) },
    { l: "زمینه‌های تخصصی", ok: saved_.tags.length > 0 }, { l: "موقعیت روی نقشه", ok: !!saved_.mapUrl }, { l: "عکس متخصص‌ها", ok: db.staff.some((s) => s.photo) },
  ];
  const pct = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  const save = () => {
    if (info.name.trim().length < 2) return setErr("نام سالن را وارد کنید.");
    if (info.phone.trim() && !isPhone(info.phone) && !/^0\d{9,10}$/.test(info.phone.replace(/[^\d۰-۹]/g, "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))))) return setErr("شماره تماس معتبر نیست.");
    if (p.website && !/^https?:\/\//i.test(p.website)) return setErr("آدرس سایت باید با http:// یا https:// شروع شود.");
    if (p.mapUrl && !/^https?:\/\//i.test(p.mapUrl)) return setErr("لینک نقشه باید با http:// یا https:// شروع شود.");
    actions.saveSalon({ ...info, profile: { ...p, instagram: cleanHandle(p.instagram), telegram: cleanHandle(p.telegram), about: p.about.trim() } });
    setErr(""); setSaved(true); setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="relative h-36 bg-[image:var(--grad-plum)]">
            {p.cover && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${p.cover})` }} role="img" aria-label="کاور سالن" />}
            <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2">
              <button type="button" onClick={() => cover.current?.click()} className="press glass inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-bold"><ImagePlus size={14} />{p.cover ? "تغییر کاور" : "افزودن کاور"}</button>
              {p.cover && <button type="button" aria-label="حذف کاور" onClick={() => setP({ ...p, cover: undefined })} className="press glass grid size-9 cursor-pointer place-items-center rounded-full text-danger"><Trash2 size={14} /></button>}
            </div>
            <input ref={cover} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setP({ ...p, cover: await readPhoto(f, 900, 360, 0.82) }); setErr(""); } catch (x) { setErr((x as Error).message); } }} />
          </div>
          <div className="-mt-9 flex items-end gap-3 px-5">
            <div className="rounded-[26px] border-4 border-surface"><BrandMark size={72} /></div>
            <div className="pb-1"><button type="button" onClick={() => logo.current?.click()} className="cursor-pointer text-[13px] font-bold text-rose">{brand.logo ? "تغییر لوگو" : "آپلود لوگو"}</button>
              {brand.logo && <button type="button" onClick={() => actions.saveSalon({ brand: { ...brand, logo: undefined } })} className="mr-3 cursor-pointer text-xs text-danger">حذف</button>}</div>
            <input ref={logo} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { actions.saveSalon({ brand: { ...brand, logo: await readLogo(f) } }); setErr(""); } catch (x) { setErr((x as Error).message); } }} />
          </div>
          <p className="px-5 pt-2 pb-4 text-xs text-ink3">لوگو همان لحظه ذخیره می‌شود و روی اپ، فرم رزرو و پنل مشتری دیده می‌شود.</p>
        </Card>

        <Card>
          <CardHead title="مشخصات و معرفی" hint="در فرم رزرو آنلاین، پنل مشتری و پیامک‌ها نمایش داده می‌شود" />
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="نام سالن"><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="تلفن"><input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} inputMode="tel" className={fieldCls} /></Field>
            <Field label="شهر"><input value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} className={fieldCls} /></Field>
            <Field label="آدرس"><input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className={fieldCls} /></Field>
            <div className="sm:col-span-2"><Field label={`درباره‌ی سالن (${fa(p.about.length)}/۳۰۰)`}><textarea value={p.about} maxLength={300} rows={3} onChange={(e) => setP({ ...p, about: e.target.value })} placeholder="مثلاً: تخصص ما رنگ و کراتین با مواد اصل است…" className={fieldCls} /></Field></div>
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-bold text-ink2">زمینه‌های تخصصی</span>
              <div className="flex flex-wrap gap-2">{tagOpts.map((t) => { const on = p.tags.includes(t); return <button key={t} type="button" aria-pressed={on} onClick={() => setP({ ...p, tags: on ? p.tags.filter((x) => x !== t) : [...p.tags, t] })} className={clsx("press min-h-9 cursor-pointer rounded-full border px-3.5 text-xs font-bold", on ? "border-transparent bg-[image:var(--grad-rose)] text-white" : "border-line bg-surface text-ink2")}>{t}</button>; })}</div>
            </div>
            <Field label="اینستاگرام (نام کاربری)"><input dir="ltr" value={p.instagram} onChange={(e) => setP({ ...p, instagram: e.target.value })} placeholder="salon_rose" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            <Field label="تلگرام (نام کاربری)"><input dir="ltr" value={p.telegram} onChange={(e) => setP({ ...p, telegram: e.target.value })} placeholder="salon_rose" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            <Field label="وب‌سایت"><input dir="ltr" value={p.website} onChange={(e) => setP({ ...p, website: e.target.value })} placeholder="https://" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            <Field label="لینک موقعیت روی نقشه"><input dir="ltr" value={p.mapUrl} onChange={(e) => setP({ ...p, mapUrl: e.target.value })} placeholder="https://maps.app.goo.gl/…" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
            <div className="flex items-center gap-3 sm:col-span-2"><Button type="submit">ذخیره‌ی پروفایل</Button>{saved && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
          </form>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-20">
        <CardHead title="کامل بودن پروفایل" hint="پروفایل کامل‌تر، اعتماد و رزرو بیشتر" />
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3"><b className="font-num text-3xl text-rosedeep">{fa(pct)}٪</b><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2"><div className="h-full rounded-full bg-[image:var(--grad-rose)] transition-all" style={{ width: `${pct}%` }} /></div></div>
          <ul className="mt-4 space-y-2">{checks.map((c) => <li key={c.l} className={clsx("flex items-center gap-2 text-[13px]", c.ok ? "text-ink" : "text-ink3")}><span className={clsx("grid size-5 shrink-0 place-items-center rounded-full", c.ok ? "bg-sagesoft text-sage" : "bg-surface2")}>{c.ok && <Check size={12} />}</span>{c.l}</li>)}</ul>
        </div>
      </Card>
    </div>
  );
}

/** «پروفایل من» برای مدیر/کاربر واردشده: عکس، نام و موبایل */
export function MyProfile() {
  const db = useDB();
  const me = db.users.find((u) => u.name === db.session?.name) ?? db.users.find((u) => u.roleId === "r1") ?? db.users[0];
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  if (!me) return null;
  const role = db.roles.find((r) => r.id === me.roleId)?.name ?? "";
  return (
    <Card className="max-w-xl">
      <CardHead title="پروفایل من" hint={`نقش: ${role}`} />
      <div className="space-y-4 px-5 pb-5">
        <PhotoPicker name={me.name} value={me.photo} size={84} onChange={(photo) => actions.setPhoto("user", me.id, photo)} />
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 3) return setErr("نام را کامل وارد کنید."); if (!isPhone(phone)) return setErr("موبایل معتبر نیست."); actions.saveUser({ ...me, name: name.trim(), phone }); setErr(""); setOk(true); setTimeout(() => setOk(false), 2200); }} className="grid gap-3 sm:grid-cols-2">
          <Field label="نام و نام خانوادگی"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="موبایل"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={fieldCls} /></Field>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
          <div className="flex items-center gap-3 sm:col-span-2"><Button type="submit">ذخیره</Button>{ok && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span>}</div>
        </form>
      </div>
    </Card>
  );
}
