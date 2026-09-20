"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { HoursEditor } from "@/components/HoursEditor";
import { BrandSettings } from "@/components/BrandSettings";
import { SalonUsers } from "@/components/UsersManager";
import { actions, useDB, type DayHours, type SalonSettings } from "@/lib/db";
import { durationDiscount, plans } from "@/lib/mock4";
import { fa, short, toman } from "@/lib/fa";

const tabs = ["مشخصات سالن", "برند و ظاهر", "ساعت کاری", "رزرو آنلاین", "اعلان‌ها", "کاربران و نقش‌ها", "اشتراک"] as const;
type Tab = (typeof tabs)[number];

function Saved({ on }: { on: boolean }) { return on ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span> : null; }

export default function SettingsPage() {
  const db = useDB();
  const [tab, setTab] = useState<Tab>("مشخصات سالن");
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState({ name: db.salon.name, phone: db.salon.phone, city: db.salon.city, address: db.salon.address });
  const [hours, setHours] = useState<DayHours[]>(db.salon.hours);
  const [online, setOnline] = useState<SalonSettings["online"]>(db.salon.online);
  const [notify, setNotify] = useState<SalonSettings["notify"]>(db.salon.notify);
  const [planId, setPlanId] = useState(db.sub.planId);
  const [months, setMonths] = useState(3);
  const [paid, setPaid] = useState<string | null>(null);

  const flash = () => { setSaved(true); setErr(""); setTimeout(() => setSaved(false), 2200); };
  const go = (t: Tab) => { setTab(t); setSaved(false); setErr(""); };

  const plan = plans.find((p) => p.id === planId)!;
  const cur = plans.find((p) => p.id === db.sub.planId)!;
  const off = durationDiscount.find((d) => d.m === months)!.off;
  const total = Math.round(plan.price * months * (1 - off / 100));
  const wallet = db.wallets.s1 ?? 0;
  const fromWallet = Math.min(wallet, total);

  return (
    <>
      <PageTitle title="تنظیمات سالن" sub="مشخصات، ساعت کاری، رزرو آنلاین، کاربران و اشتراک" />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => go(t)} className={clsx("press min-h-10 cursor-pointer rounded-full border px-4 py-2 text-[13px] font-bold", tab === t ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{t}</button>)}
      </div>

      {tab === "مشخصات سالن" && (
        <Card className="max-w-3xl">
          <CardHead title="مشخصات سالن" hint="در فرم رزرو آنلاین و پیامک‌ها نمایش داده می‌شود" />
          <form onSubmit={(e) => { e.preventDefault(); if (info.name.trim().length < 2) return setErr("نام سالن را وارد کنید."); actions.saveSalon(info); flash(); }} className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Field label="نام سالن"><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className={fieldCls} /></Field>
            <Field label="تلفن"><input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} inputMode="tel" className={fieldCls} /></Field>
            <Field label="شهر"><input value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} className={fieldCls} /></Field>
            <Field label="آدرس"><input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className={fieldCls} /></Field>
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{err}</p>}
            <div className="flex items-center gap-3 sm:col-span-2"><Button type="submit">ذخیره</Button><Saved on={saved} /></div>
          </form>
        </Card>
      )}

      {tab === "برند و ظاهر" && <BrandSettings />}

      {tab === "ساعت کاری" && (
        <Card className="max-w-3xl">
          <CardHead title="ساعت کاری سالن" hint="روزهای تعطیل در تقویم و رزرو آنلاین غیرفعال می‌شوند" />
          <div className="space-y-4 px-5 pb-5">
            <HoursEditor hours={hours} onChange={(h) => { setHours(h); setSaved(false); }} />
            {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
            <div className="flex items-center gap-3"><Button onClick={() => { if (hours.some((h) => h.open && h.end <= h.start)) return setErr("ساعت پایان باید بعد از شروع باشد."); if (!hours.some((h) => h.open)) return setErr("حداقل یک روز باید باز باشد."); actions.saveSalon({ hours }); flash(); }}>ذخیره</Button><Saved on={saved} /></div>
          </div>
        </Card>
      )}

      {tab === "رزرو آنلاین" && (
        <Card className="max-w-3xl">
          <CardHead title="رزرو آنلاین" hint="قوانین فرم عمومی رزرو (/book)" />
          <div className="space-y-4 px-5 pb-5">
            {([["enabled", "رزرو آنلاین فعال باشد", "با غیرفعال‌سازی، فرم عمومی رزرو بسته می‌شود"], ["autoConfirm", "تأیید خودکار نوبت‌ها", "نوبت‌های آنلاین بدون بررسی شما «تأییدشده» ثبت می‌شوند"]] as const).map(([k, l, h]) => (
              <div key={k} className="flex items-start gap-3"><Toggle on={online[k]} label={l} onChange={(v) => { setOnline({ ...online, [k]: v }); setSaved(false); }} /><div><p className="text-sm font-semibold">{l}</p><p className="text-xs text-ink3">{h}</p></div></div>
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="حداقل فاصله تا نوبت (ساعت)"><input type="number" min={0} max={72} value={online.leadHours} onChange={(e) => { setOnline({ ...online, leadHours: Math.max(0, +e.target.value || 0) }); setSaved(false); }} className={fieldCls} /></Field>
              <Field label="مهلت لغو رایگان (ساعت قبل از نوبت)"><input type="number" min={0} max={72} value={online.cancelHours} onChange={(e) => { setOnline({ ...online, cancelHours: Math.max(0, +e.target.value || 0) }); setSaved(false); }} className={fieldCls} /></Field>
            </div>
            <div className="flex items-center gap-3"><Button onClick={() => { actions.saveSalon({ online }); flash(); }}>ذخیره</Button><Saved on={saved} /></div>
          </div>
        </Card>
      )}

      {tab === "اعلان‌ها" && (
        <Card className="max-w-3xl">
          <CardHead title="پیامک‌های خودکار" />
          <div className="space-y-4 px-5 pb-5">
            {([["remind24", "یادآوری ۲۴ ساعت قبل از نوبت"], ["remind2", "یادآوری ۲ ساعت قبل از نوبت"], ["birthday", "تبریک و هدیه‌ی تولد مشتری"], ["review", "نظرسنجی بعد از خدمت"]] as const).map(([k, l]) => (
              <div key={k} className="flex items-center gap-3"><Toggle on={notify[k]} label={l} onChange={(v) => { setNotify({ ...notify, [k]: v }); setSaved(false); }} /><span className="text-sm">{l}</span></div>
            ))}
            <div className="flex items-center gap-3"><Button onClick={() => { actions.saveSalon({ notify }); flash(); }}>ذخیره</Button><Saved on={saved} /></div>
          </div>
        </Card>
      )}

      {tab === "کاربران و نقش‌ها" && <SalonUsers />}

      {tab === "اشتراک" && (
        <div className="max-w-3xl space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1"><p className="text-xs text-ink3">پلن فعلی</p><h2 className="text-xl font-extrabold">{cur.name}</h2><p className="mt-1 text-sm text-ink2">{toman(cur.price)} در ماه · تا {fa(cur.users)} کاربر</p></div>
              <div className="text-left"><Badge tone={db.sub.status === "فعال" ? "sage" : db.sub.status === "آزمایشی" ? "sky" : "danger"}>{db.sub.status}</Badge><p className="mt-1.5 text-xs text-ink2">پایان: {db.sub.expiry}</p></div>
            </div>
            <p className="mt-4 rounded-xl bg-sagesoft p-3 text-sm text-sage">موجودی کیف پول (پورسانت فروشگاه): <b>{toman(wallet)}</b></p>
          </Card>
          <Card>
            <CardHead title="تمدید یا تغییر پلن" />
            <div className="space-y-4 px-5 pb-5">
              <div className="grid gap-2 sm:grid-cols-3">
                {plans.map((p) => <button key={p.id} onClick={() => { setPlanId(p.id); setPaid(null); }} aria-pressed={planId === p.id} className={clsx("cursor-pointer rounded-xl border p-3 text-right", planId === p.id ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2")}><b className="block text-sm">{p.name}</b><span className="text-xs text-ink2">{short(p.price)} / ماه</span></button>)}
              </div>
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="مدت">
                {durationDiscount.map((d) => <button key={d.m} role="radio" aria-checked={months === d.m} onClick={() => { setMonths(d.m); setPaid(null); }} className={clsx("cursor-pointer rounded-xl border py-2 text-[13px] font-bold", months === d.m ? "border-rose bg-rosesoft text-rosedeep" : "border-line")}>{fa(d.m)} ماه{d.off > 0 && <span className="block text-[10px] font-medium text-sage">{fa(d.off)}٪</span>}</button>)}
              </div>
              <dl className="divide-y divide-line rounded-xl border border-line text-sm">
                <div className="flex justify-between px-4 py-2.5"><dt className="text-ink3">مبلغ کل</dt><dd className="font-bold">{toman(total)}</dd></div>
                <div className="flex justify-between px-4 py-2.5"><dt className="text-ink3">کسر از کیف پول</dt><dd className="font-bold text-sage">− {toman(fromWallet)}</dd></div>
                <div className="flex justify-between px-4 py-2.5"><dt className="text-ink3">پرداخت آنلاین</dt><dd className="font-extrabold text-rosedeep">{total - fromWallet ? toman(total - fromWallet) : "رایگان ✓"}</dd></div>
              </dl>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => { actions.paySubscription(planId, months, fromWallet); setPaid(`اشتراک ${plan.name} ${fa(months)} ماهه فعال شد.`); }}>{total - fromWallet ? "پرداخت مابقی و فعال‌سازی" : "فعال‌سازی با کیف پول"}</Button>
                {paid && <span role="status" className="text-sm font-semibold text-sage">{paid}</span>}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
