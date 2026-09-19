"use client";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Cake, CalendarClock, Camera, Crown, Droplets, Flower2, Gift, Hand, Phone, Scissors, Share2, Sparkles, StickyNote, Wallet } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, tierTone } from "@/components/ui";
import { catColor, profile } from "@/lib/mock";
import { fa, short, toman, num } from "@/lib/fa";

type C = typeof profile;
const tabs = ["نمای کلی", "پرونده زیبایی", "سوابق خدمات", "خریدها"] as const;

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-2 text-sm"><dt className="text-ink3">{k}</dt><dd className="text-left font-medium text-ink">{v}</dd></div>;
}

function BeforeAfter({ label }: { label: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["قبل", "بعد"].map((t, i) => (
        <div key={t} className="relative grid aspect-[4/5] place-items-center rounded-xl border border-dashed border-line"
          style={{ background: i ? "linear-gradient(160deg,#f7e4ea,#f6ecd6)" : "linear-gradient(160deg,#efe6df,#e6d9cf)" }}>
          <Camera className="text-ink3" size={22} />
          <span className="absolute bottom-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-ink2">{t}</span>
        </div>
      ))}
      <p className="col-span-2 text-center text-xs text-ink3">{label}</p>
    </div>
  );
}

export function Profile({ c }: { c: C }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("نمای کلی");
  const pct = Math.round((c.points / (c.points + c.nextRewardIn)) * 100);
  return (
    <>
      {/* هدر: آرایشگر با یک نگاه مشتری را می‌شناسد */}
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
              <span className="inline-flex items-center gap-1"><Cake size={13} />{c.birth} ({fa(c.age)} ساله)</span>
              <span>{c.gender}</span>
            </p>
          </div>
          <div className="flex gap-2"><Button variant="ghost">پیام</Button><Button><CalendarClock size={14} />ثبت نوبت</Button></div>
        </div>
      </Card>

      {/* هشدار ایمنی همیشه در دید */}
      <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-dangersoft px-5 py-3.5">
        <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={18} />
        <div className="text-sm">
          <b className="text-danger">حساسیت‌ها و نکات مهم: </b>
          <span className="text-ink">{c.allergies.join(" · ")}</span>
          <p className="mt-1 text-ink2">{c.note}</p>
        </div>
      </div>

      {/* پیشنهاد نوبت بعدی */}
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-rose/25 bg-rosesoft px-5 py-3.5">
        <Sparkles className="text-rose" size={20} />
        <p className="flex-1 text-sm text-ink"><b>زمان احتمالی مراجعه بعدی: {c.nextDue}</b> — ترمیم رنگ ریشه · چرخه‌ی معمول ایشان {fa(c.cycleDays)} روز است ({fa(c.lastVisitDays)} روز گذشته).</p>
        <Button>ارسال پیشنهاد نوبت</Button>
      </div>

      {/* KPI */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["تعداد مراجعات", fa(c.visits)], ["مجموع خرید", short(c.total)], ["میانگین فاکتور", short(c.avg)], ["آخرین مراجعه", `${c.lastVisit}`]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-ink2">{l}</p><p className="mt-1.5 text-xl font-extrabold">{v}</p></Card>
        ))}
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={clsx("-mb-px cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors", tab === t ? "border-rose text-rosedeep" : "border-transparent text-ink2 hover:text-ink")}>{t}</button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {tab === "نمای کلی" && (
            <>
              <Card>
                <CardHead title="ترجیحات" />
                <dl className="divide-y divide-line px-5 pb-3">
                  <Row k="خدمت موردعلاقه" v={c.favService} /><Row k="متخصص موردعلاقه" v={c.favStaff} />
                  {c.occasions.map((o) => <Row key={o} k="مناسبت" v={o.split(": ")[1] ? `${o.split(": ")[0]} — ${o.split(": ")[1]}` : o} />)}
                </dl>
              </Card>
              <Card>
                <CardHead title="محصولات خریداری‌شده" />
                <ul className="flex flex-wrap gap-2 px-5 pb-5">{c.products.map((p) => <Badge key={p} tone="gold">{p}</Badge>)}</ul>
              </Card>
              <Card>
                <CardHead title="آخرین خدمات" />
                <ul className="divide-y divide-line">{c.log.slice(0, 3).map((l) => <LogRow key={l.d + l.s} l={l} />)}</ul>
              </Card>
            </>
          )}

          {tab === "پرونده زیبایی" && (
            <>
              <Card>
                <CardHead title="مو" action={<Scissors size={17} className="text-rose" />} />
                <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
                  <dl className="divide-y divide-line">
                    <Row k="رنگ فعلی" v={c.hair.current} /><Row k="نوع مو" v={c.hair.type} /><Row k="وضعیت مو" v={c.hair.state} />
                    <Row k="برند مصرفی" v={c.hair.brand} /><Row k="اکسیدان" v={c.hair.oxidant} /><Row k="آخرین رنگ" v={c.hair.lastColor} />
                  </dl>
                  <div>
                    <p className="text-xs font-semibold text-ink3">فرمول رنگ (آخرین)</p>
                    <div className="mt-1.5 rounded-xl border border-rose/25 bg-rosesoft p-3 text-sm font-medium text-rosedeep">{c.hair.formula}</div>
                    <p className="mt-3 text-xs font-semibold text-ink3">رنگ‌های قبلی</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-ink2">{c.hair.history.map((h) => <li key={h}>• {h}</li>)}</ul>
                  </div>
                </div>
              </Card>
              <Card>
                <CardHead title="پوست" action={<Droplets size={17} className="text-sage" />} />
                <dl className="divide-y divide-line px-5 pb-3">
                  <Row k="نوع پوست" v={c.skin.type} /><Row k="محصولات استفاده‌شده" v={c.skin.used} /><Row k="حساسیت‌ها" v={c.skin.allergies} /><Row k="سوابق فیشال" v={c.skin.facials.join("، ")} />
                </dl>
              </Card>
              <Card>
                <CardHead title="ناخن" action={<Hand size={17} className="text-gold" />} />
                <dl className="divide-y divide-line px-5 pb-3">
                  <Row k="نوع خدمات" v={c.nail.services} /><Row k="رنگ‌های موردعلاقه" v={c.nail.colors} /><Row k="حساسیت‌ها" v={c.nail.allergies} />
                </dl>
              </Card>
            </>
          )}

          {tab === "سوابق خدمات" && (
            <Card>
              <CardHead title="قبل → خدمت → بعد" hint="هر ویزیت با عکس و مشخصات" />
              <ul className="divide-y divide-line">
                {c.log.map((l) => (
                  <li key={l.d + l.s} className="px-5 py-4">
                    <LogRow l={l} bare />
                    {l.photos && <div className="mx-auto mt-3 max-w-xs"><BeforeAfter label={`${l.s} — ${l.d}`} /></div>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {tab === "خریدها" && (
            <Card>
              <CardHead title="محصولات خریداری‌شده" />
              <ul className="divide-y divide-line">{c.products.map((p) => <li key={p} className="flex items-center justify-between px-5 py-3 text-sm">{p}<Button variant="soft">خرید مجدد</Button></li>)}</ul>
            </Card>
          )}
        </div>

        {/* ستون کناری: مزایا */}
        <aside className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-plum px-5 py-4 text-white">
              <p className="text-xs text-white/70">مزایای من در این سالن</p>
              <p className="mt-1 text-3xl font-extrabold">{num(c.points)} <span className="text-sm font-medium text-white/70">امتیاز</span></p>
              <div className="mt-3 h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1.5 text-xs text-white/70">{fa(c.nextRewardIn)} امتیاز تا جایزه‌ی بعدی</p>
            </div>
            <dl className="divide-y divide-line px-5 py-2">
              <Row k="سطح" v={c.tier} /><Row k="تخفیف من" v="۱۰٪" /><Row k="هدیه تولد" v="یک فیشال" />
              <div className="flex items-center justify-between py-2 text-sm"><dt className="inline-flex items-center gap-1.5 text-ink3"><Wallet size={14} />کیف پول</dt><dd className="font-semibold">{toman(c.wallet)}</dd></div>
              <div className="flex items-center justify-between py-2 text-sm"><dt className="inline-flex items-center gap-1.5 text-ink3"><Share2 size={14} />معرفی‌شده‌ها</dt><dd className="font-semibold">{fa(c.referrals)} نفر</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHead title="یادداشت متخصص" action={<StickyNote size={16} className="text-ink3" />} />
            <div className="px-5 pb-5">
              <p className="rounded-xl bg-goldsoft p-3 text-sm leading-7 text-ink">«{c.note}» <span className="block text-xs text-ink3">— {c.favStaff}</span></p>
              <Button variant="ghost" className="mt-3 w-full">+ افزودن یادداشت</Button>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4"><Gift className="text-rose" /><p className="text-sm text-ink2">تولد <b className="text-ink">۱۵ آذر</b> نزدیک است؛ هدیه‌ی تولد به‌صورت خودکار ارسال می‌شود.</p></Card>
          <Card className="flex items-center gap-3 p-4"><Flower2 className="text-sage" /><p className="text-sm text-ink2">پیشنهاد محصول: <b className="text-ink">ماسک ترمیم رنگ</b> برای حفظ نتیجه‌ی رنگ.</p></Card>
        </aside>
      </div>
    </>
  );
}

function LogRow({ l, bare }: { l: C["log"][number]; bare?: boolean }) {
  const cc = catColor[l.cat];
  return (
    <div className={clsx("flex items-center gap-3", !bare && "px-5 py-3")}>
      <span className={clsx("grid size-9 place-items-center rounded-xl text-xs font-bold", cc.bg, cc.fg)}>{l.cat}</span>
      <div className="flex-1"><p className="text-sm font-semibold">{l.s}</p><p className="text-xs text-ink3">{l.d} · {l.by}</p></div>
      <span className="text-sm font-semibold">{short(l.price)}</span>
    </div>
  );
}
