"use client";
import { useRef, useState } from "react";
import clsx from "clsx";
import { Check, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { InstallPrompt } from "./InstallPrompt";
import { Button, Card, CardHead, Field, Toggle, fieldCls } from "./ui";
import { actions, useDB } from "@/lib/db";
import { brandOf, DEFAULT_COLOR, isHex, palette, presets, readLogo, type Brand } from "@/lib/theme";
import { fa } from "@/lib/fa";

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [txt, setTxt] = useState(value);
  const set = (c: string) => { setTxt(c); if (isHex(c)) onChange(c.toLowerCase()); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-9">
        {presets.map((p) => (
          <button key={p.c} type="button" aria-label={p.n} title={p.n} onClick={() => set(p.c)} className="press grid aspect-square cursor-pointer place-items-center rounded-2xl text-white shadow-[var(--shadow-card)]" style={{ background: p.c }}>
            {value.toLowerCase() === p.c && <Check size={18} />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-line" title="انتخاب رنگ دلخواه">
          <input type="color" value={isHex(value) ? value : DEFAULT_COLOR} onChange={(e) => set(e.target.value)} className="absolute -inset-2 size-[calc(100%+16px)] cursor-pointer" aria-label="رنگ دلخواه" />
        </label>
        <input dir="ltr" value={txt} onChange={(e) => set(e.target.value)} onBlur={() => setTxt(value)} maxLength={7} aria-label="کد رنگ" className={clsx(fieldCls, "max-w-36 text-left font-mono")} />
        <span className="text-xs text-ink3">رنگ دلخواه یا کد HEX</span>
      </div>
    </div>
  );
}

function Preview({ color, title, sub }: { color: string; title: string; sub: string }) {
  const vars = color.toLowerCase() === DEFAULT_COLOR ? {} : palette(color);
  return (
    <div style={vars as React.CSSProperties} className="overflow-hidden rounded-[24px] border border-line bg-bg">
      <div className="flex items-center gap-2.5 border-b border-line bg-surface px-3.5 py-2.5"><BrandMark size={32} /><div className="min-w-0 leading-tight"><p className="truncate text-[13px] font-extrabold text-ink">{title}</p><p className="text-[10.5px] text-ink3">{sub}</p></div></div>
      <div className="space-y-2.5 p-3.5">
        <div className="rounded-2xl bg-[image:var(--grad-plum)] p-3.5 text-white"><p className="text-[10.5px] text-white/65">فروش امروز</p><p className="text-xl font-extrabold">{fa("۸٫۸")} میلیون</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-[image:var(--grad-rose)] px-3.5 py-1.5 text-xs font-bold text-white">دکمه‌ی اصلی</span><span className="rounded-full bg-rosesoft px-3 py-1.5 text-xs font-bold text-rosedeep">برچسب</span></div>
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink2">کارت و متن نمونه</div>
      </div>
    </div>
  );
}

export function BrandSettings() {
  const db = useDB();
  const saved = brandOf(db.salon);
  const [b, setB] = useState<Brand>(saved);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(b) !== JSON.stringify(saved);

  const save = () => { actions.saveSalon({ brand: b }); setMsg("تغییرات ذخیره و اعمال شد."); setTimeout(() => setMsg(""), 2500); };
  const pick = async (f?: File) => { if (!f) return; try { setB({ ...b, logo: await readLogo(f) }); setErr(""); } catch (e) { setErr((e as Error).message); } };

  return (
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card>
          <CardHead title="لوگو و نام اپلیکیشن" hint="روی صفحه‌ی اصلی گوشی شما و مشتریانتان با همین نام و لوگو نصب می‌شود" />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex items-center gap-4">
              <BrandMark size={72} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => file.current?.click()}><ImagePlus size={16} />{b.logo ? "تغییر لوگو" : "آپلود لوگو"}</Button>
                {b.logo && <Button type="button" variant="ghost" onClick={() => setB({ ...b, logo: undefined })}><Trash2 size={15} />حذف</Button>}
                <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>
            <p className="text-xs leading-6 text-ink3">تصویر مربع یا با پس‌زمینه‌ی شفاف (PNG) بهترین نتیجه را می‌دهد. بدون لوگو، نماد پیش‌فرض یا حرف اول نام روی رنگ برند ساخته می‌شود.</p>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
            <Field label="نام اپ روی صفحه‌ی اصلی گوشی (کوتاه)"><input value={b.appName ?? ""} maxLength={20} placeholder={db.salon.name} onChange={(e) => setB({ ...b, appName: e.target.value })} className={fieldCls} /></Field>
          </div>
        </Card>

        <Card>
          <CardHead title="رنگ نرم‌افزار سالن" hint="پس‌زمینه، دکمه‌ها، نوارها و برچسب‌ها با رنگ انتخابی هماهنگ می‌شوند" />
          <div className="px-5 pb-5"><ColorPick value={b.appColor} onChange={(c) => setB({ ...b, appColor: c })} /></div>
        </Card>

        <Card>
          <CardHead title="رنگ پنل مشتری و فرم رزرو" hint="آنچه مشتریان شما می‌بینند" action={<Toggle on={b.portalSame} onChange={(v) => setB({ ...b, portalSame: v })} label="هم‌رنگ نرم‌افزار" />} />
          <div className="px-5 pb-5">
            {b.portalSame ? <p className="text-sm text-ink2">پنل مشتری با رنگ نرم‌افزار سالن یکی است. برای رنگ جداگانه، گزینه را خاموش کنید.</p> : <ColorPick value={b.portalColor} onChange={(c) => setB({ ...b, portalColor: c })} />}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!dirty}>ذخیره و اعمال</Button>
          <Button variant="ghost" onClick={() => setB({ ...b, appColor: DEFAULT_COLOR, portalColor: DEFAULT_COLOR, portalSame: true })}><RotateCcw size={15} />رنگ پیش‌فرض</Button>
          {msg && <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />{msg}</span>}
        </div>

        <Card>
          <CardHead title="نصب اپلیکیشن روی گوشی" hint="اپ سالن برای شما، و اپ مشتری برای مشتریان شما" />
          <div className="space-y-5 px-5 pb-5">
            <div><p className="mb-2 text-[13px] font-bold">اپ مدیریت سالن (برای شما و همکاران)</p><InstallPrompt /></div>
            <div className="border-t border-line pt-4"><p className="mb-1 text-[13px] font-bold">اپ مشتریان</p><p className="mb-2 text-xs leading-6 text-ink3">این لینک را در پیامک، اینستاگرام یا با کد QR در سالن به مشتریان بدهید؛ اپ با نام و لوگوی سالن شما نصب می‌شود.</p><InstallPrompt link={typeof window !== "undefined" ? `${window.location.origin}/me` : "/me"} /></div>
            <p className="rounded-xl bg-goldsoft p-3 text-xs leading-6 text-ink2">در نسخه‌ی نمایشی هر دو اپ روی یک آدرس‌اند. در نسخه‌ی نهایی هر سالن آدرس اختصاصی خودش را دارد (مثلاً <span dir="ltr">rose.exir.app</span>) تا هویت اپ کاملاً جدا باشد.</p>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <p className="text-xs font-bold text-ink3">پیش‌نمایش زنده</p>
        <Preview color={b.appColor} title={(b.appName || db.salon.name)} sub="نرم‌افزار سالن" />
        <Preview color={b.portalSame ? b.appColor : b.portalColor} title={db.salon.name} sub="پنل مشتری" />
      </div>
    </div>
  );
}
