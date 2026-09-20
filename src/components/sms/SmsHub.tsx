"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { BadgeCheck, Check, Flame, MessageSquareText, Play, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls, type Tone } from "@/components/ui";
import { DataList } from "@/components/DataList";
import { useDB } from "@/lib/db";
import { autoMeta, growth } from "@/lib/growth";
import { myAccount, packageCredits, perSms, searchNumbers, sms, stats, tierOf, usage } from "@/lib/sms";
import { dayInfo } from "@/lib/dates";
import { digits } from "@/lib/validate";
import { fa, num, short, toman } from "@/lib/fa";

const tabs = [{ k: "overview", l: "نمای کلی" }, { k: "charge", l: "شارژ" }, { k: "line", l: "خط اختصاصی" }, { k: "log", l: "ارسال‌ها" }] as const;
type Tab = (typeof tabs)[number]["k"];
const statusTone: Record<string, Tone> = { "ارسال‌شده": "sage", "ناموفق": "danger", "در انتظار تأیید": "sky", "مسدود": "amber", "رد شد": "neutral" };
const tierTone: Record<string, Tone> = { "عادی": "neutral", "رند": "sky", "طلایی": "gold", "الماس": "rose" };
const fmt = (n: number) => num(n);

export function SmsHub({ initialTab, pkg }: { initialTab?: string; pkg?: string }) {
  const db = useDB();
  const acc = myAccount(db);
  const st = stats(db);
  const us = usage(db);
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.k === initialTab) ? (initialTab as Tab) : "overview");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [selPkg, setSelPkg] = useState(pkg ?? us.recommended.id);
  const wallet = db.wallets.s1 ?? 0;
  const note = (r: { ok: boolean; msg: string }) => setMsg({ ok: r.ok, t: r.msg });

  // ---- خط اختصاصی
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [kyc, setKyc] = useState({ holder: "", idNo: "", doc: false });
  const [linePay, setLinePay] = useState<"online" | "wallet">("online");
  const [kycErr, setKycErr] = useState("");
  const results = searchNumbers(q, db.smsPricing);
  const picked = results.find((r) => r.number === pick);

  // ---- لاگ
  const [fs, setFs] = useState("all");
  const [ft, setFt] = useState("all");
  const mine = db.smsLog.filter((m) => m.tenantId === acc.tenantId);
  const queue = mine.filter((m) => m.status === "در انتظار تأیید");
  const rows = mine.filter((m) => (fs === "all" || m.scenario === fs) && (ft === "all" || m.status === ft)).slice(0, 80);
  const blocked = mine.filter((m) => m.status === "مسدود" && m.day >= -6);
  const scenLabel = (id: string) => (autoMeta as Record<string, { label: string }>)[id]?.label ?? (id === "campaign" ? "کمپین" : id);

  return (
    <>
      <PageTitle title="پیامک و اعتبار" sub="اعتبار لحظه‌ای، خط اختصاصی و پیام‌های خودکار سالن" actions={<Link href="/automation" className="inline-flex items-center gap-1.5 rounded-xl bg-rose px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-rosedeep"><Zap size={14} />سناریوهای خودکار</Link>} />
      <div className="mb-5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap" role="tablist">
        {tabs.map((t) => <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => { setTab(t.k); setMsg(null); }} className={clsx("cursor-pointer rounded-xl border px-4 py-2 text-[13px] font-semibold", tab === t.k ? "border-rose bg-rose text-white" : "border-line bg-surface text-ink2 hover:bg-surface2")}>{t.l}{t.k === "log" && queue.length > 0 && <span className="mr-1 rounded-full bg-sky px-1.5 text-[10px] text-white">{fa(queue.length)}</span>}</button>)}
      </div>
      {msg && <p role="status" className={clsx("mb-4 rounded-xl p-3 text-sm", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}

      {tab === "overview" && (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="grid gap-px bg-line md:grid-cols-[1.2fr_1fr]">
              <div className="bg-plum p-6 text-white">
                <p className="text-xs text-white/60">اعتبار پیامک شما (لحظه‌ای)</p>
                <p className="mt-1 text-4xl font-extrabold">{fmt(acc.balance)} <span className="text-base font-medium text-white/60">پیامک</span></p>
                <p className="mt-2 text-sm text-white/75">{acc.balance <= 0 ? "اعتبار تمام شده است" : `با مصرف فعلی (${fa(Math.round(us.daily))} در روز) حدود ${fa(us.daysLeft)} روز دیگر کافی است`}</p>
                <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setTab("charge")}>شارژ اعتبار</Button><Button variant="ghost" className="!border-white/30 !bg-transparent !text-white hover:!bg-white/10" onClick={() => setTab("line")}>خط اختصاصی</Button></div>
              </div>
              <div className="space-y-2 bg-surface p-6 text-sm">
                <p className="text-xs text-ink3">خط ارسال</p>
                <p className="flex items-center gap-2 text-lg font-extrabold"><bdi dir="ltr">{acc.line.number}</bdi>{acc.line.kind === "dedicated" ? <Badge tone={acc.line.status === "فعال" ? "sage" : "amber"}>{acc.line.status === "فعال" ? "اختصاصی" : "در انتظار تأیید"}</Badge> : <Badge>مشترک اکسیر</Badge>}</p>
                {acc.line.kind === "shared" && <p className="text-xs leading-6 text-ink2">پیام‌ها از خط مشترک می‌روند. با شماره‌ی اختصاصی، نام سالن و شماره‌ی خودتان روی پیام می‌نشیند و مشتری می‌تواند پاسخ دهد.</p>}
              </div>
            </div>
          </Card>

          {blocked.length > 0 && <Card className="flex flex-wrap items-center gap-3 border-amber/40 bg-ambersoft px-5 py-4"><Flame className="text-amber" /><p className="min-w-0 flex-1 basis-56 text-sm"><b>{fa(blocked.length)} پیام</b> در ۷ روز اخیر به‌دلیل کمبود اعتبار ارسال نشد؛ ارزش تقریبی درآمد از دست‌رفته <b>{short(blocked.reduce((a, m) => a + (m.value ?? 0), 0))}</b> تومان.</p><Button onClick={() => setTab("charge")}>شارژ و جبران</Button></Card>}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="ارسال ۳۰ روز" value={fmt(st.sent)} sub={`${fa(Math.round(st.delivery * 100))}٪ تحویل`} tone="sky" icon={<MessageSquareText size={16} />} />
            <Stat label="درآمد قابل‌انتساب" value={short(st.revenue)} sub="خرید مشتری تا ۵ روز بعد از پیام تبلیغاتی" tone="sage" />
            <Stat label="بازده هر پیامک" value={st.perSms ? `${short(st.perSms)}` : "—"} sub="درآمد به‌ازای هر پیام" tone="gold" />
            <Stat label="هزینه‌ی ۳۰ روز" value={short(st.credits * db.smsPricing.sell)} sub={`${fa(st.credits)} بخش پیامک`} tone="rose" />
          </div>

          <p className="text-xs leading-6 text-ink3">توضیح: درآمد قابل‌انتساب فقط برای پیام‌های تبلیغاتی و کمپین محاسبه می‌شود (مشتری تا ۵ روز بعد خرید کرده باشد) و لزوماً به‌معنای اثر مستقیم پیامک نیست؛ یادآوری نوبت اثرش را در کاهش نوبت‌های ازدست‌رفته نشان می‌دهد.</p>
          <Card>
            <CardHead title="سناریوهای خودکار" hint="روشن/خاموش سریع؛ تنظیم دقیق در صفحه‌ی سناریوها" action={<Button variant="soft" onClick={() => { const s = sms.runAll(); setMsg({ ok: true, t: `${fa(s.rules)} سناریو اجرا شد · ${fa(s.sent)} ارسال · ${fa(s.queued)} در انتظار تأیید · ${fa(s.blocked)} مسدود` }); }}><Play size={14} />اجرای امروز</Button>} />
            <ul className="divide-y divide-line">
              {db.automations.slice(0, 9).map((r) => { const by = st.byScenario[r.kind]; return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"><span className="min-w-0 flex-1 basis-40 font-semibold">{autoMeta[r.kind].label}</span>{r.approval && <Badge tone="rose">با تأیید</Badge>}<span className="text-xs text-ink3">{by ? `${fa(by.sent)} ارسال${by.attr ? ` · ${short(by.attr)} درآمد` : ""}` : "—"}</span><Toggle on={r.on} label={`فعال‌سازی ${autoMeta[r.kind].label}`} onChange={(v) => growth.saveRule({ ...r, on: v })} /></li>
              ); })}
            </ul>
          </Card>
        </div>
      )}

      {tab === "charge" && (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center gap-3 border-rose/30 bg-rosesoft/50 p-5">
            <Sparkles className="text-rose" />
            <p className="min-w-0 flex-1 basis-64 text-sm leading-7">برای ۳۰ روز آینده با روند مصرف شما به حدود <b>{fa(us.need30)} پیامک</b> نیاز دارید. بسته‌ی پیشنهادی: <b>{fa(us.recommended.count)} تایی</b> با {fa(us.recommended.bonusPct)}٪ هدیه (هر پیامک {fa(perSms(us.recommended))} تومان).</p>
            <Button onClick={() => setSelPkg(us.recommended.id)}>انتخاب بسته‌ی پیشنهادی</Button>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {db.smsPricing.packages.map((p) => {
              const on = selPkg === p.id; const rec = us.recommended.id === p.id;
              return (
                <Card key={p.id} className={clsx("relative p-5", on && "border-rose ring-1 ring-rose")}>
                  {rec && <Badge tone="rose" className="absolute left-3 top-3">پیشنهادی</Badge>}
                  <button aria-pressed={on} onClick={() => setSelPkg(p.id)} className="block w-full cursor-pointer text-right">
                    <p className="text-2xl font-extrabold">{fmt(p.count)}<span className="text-xs font-medium text-ink3"> پیامک</span></p>
                    {p.bonusPct > 0 ? <p className="mt-1 text-sm font-bold text-sage">+ {fa(p.bonusPct)}٪ هدیه ({fmt(packageCredits(p) - p.count)})</p> : <p className="mt-1 text-sm text-ink3">بدون هدیه</p>}
                    <p className="mt-3 text-lg font-bold">{toman(p.price)}</p>
                    <p className="text-xs text-ink3">هر پیامک {fa(perSms(p))} تومان</p>
                  </button>
                  <div className="mt-4 grid gap-2">
                    <Button onClick={() => note(sms.topup(p.id, "online"))}>خرید آنلاین</Button>
                    <Button variant="ghost" onClick={() => note(sms.topup(p.id, "wallet"))}>از کیف پول پورسانت</Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="text-xs text-ink3">کیف پول پورسانت شما: <b>{toman(wallet)}</b> — درآمد فروشگاه را می‌توانید مستقیم به پیامک تبدیل کنید.</p>

          <Card>
            <CardHead title="شارژ خودکار" hint="هیچ‌وقت وسط کمپین یا یادآوری نوبت اعتبار کم نیاورید" />
            <div className="space-y-4 px-5 pb-5">
              <div className="flex items-center gap-3"><Toggle on={acc.autoRecharge.on} label="شارژ خودکار" onChange={(v) => sms.setAuto({ ...acc.autoRecharge, on: v })} /><span className="text-sm">{acc.autoRecharge.on ? "فعال است" : "غیرفعال"}</span></div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="وقتی اعتبار به این مقدار رسید"><input type="number" min={10} value={acc.autoRecharge.threshold} onChange={(e) => sms.setAuto({ ...acc.autoRecharge, threshold: Math.max(10, +e.target.value || 10) })} className={fieldCls} /></Field>
                <Field label="این بسته خریداری شود"><select value={acc.autoRecharge.packageId} onChange={(e) => sms.setAuto({ ...acc.autoRecharge, packageId: e.target.value })} className={fieldCls}>{db.smsPricing.packages.map((p) => <option key={p.id} value={p.id}>{fmt(p.count)} تایی · {short(p.price)}</option>)}</select></Field>
                <Field label="پرداخت از"><select value={acc.autoRecharge.source} onChange={(e) => sms.setAuto({ ...acc.autoRecharge, source: e.target.value as "wallet" | "online" })} className={fieldCls}><option value="online">کارت بانکی ذخیره‌شده</option><option value="wallet">کیف پول پورسانت</option></select></Field>
              </div>
              <div className="flex items-center gap-3 border-t border-line pt-3"><Toggle on={acc.optOut} label="عبارت لغو ۱۱" onChange={(v) => sms.setOptOut(v)} /><span className="text-sm">افزودن «لغو۱۱» به پیام‌های تبلیغاتی (الزام قانونی؛ یک کاراکتر بیشتر)</span></div>
            </div>
          </Card>

          <Card>
            <CardHead title="تراکنش‌های اعتبار" />
            <ul className="divide-y divide-line">
              {db.smsTx.filter((x) => x.tenantId === acc.tenantId).slice(0, 12).map((x) => <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm"><Badge tone={x.kind === "شارژ" ? "sage" : x.kind === "ارسال" ? "sky" : "gold"}>{x.kind}</Badge><span className="min-w-0 flex-1 basis-40">{x.note}<span className="mr-2 text-xs text-ink3">{x.day === 0 ? "امروز" : dayInfo(x.day).short}</span></span><b className={x.credits >= 0 ? "text-sage" : "text-ink2"}>{x.credits >= 0 ? "+" : "−"}{fmt(Math.abs(x.credits))}</b>{x.amount > 0 && <span className="text-xs text-ink3">{toman(x.amount)}</span>}</li>)}
            </ul>
          </Card>
        </div>
      )}

      {tab === "line" && (
        <div className="space-y-5">
          {acc.line.kind === "dedicated" && acc.line.status !== "رد شد" ? (
            <Card className="p-6">
              <p className="text-xs text-ink3">خط اختصاصی شما</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-extrabold"><bdi dir="ltr">{acc.line.number}</bdi><Badge tone={tierTone[acc.line.tier ?? "عادی"]}>{acc.line.tier}</Badge></p>
              {acc.line.status === "فعال" ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-sagesoft p-3 text-sm text-sage"><BadgeCheck size={18} />فعال است؛ همه‌ی پیام‌های سالن از این شماره ارسال می‌شود.</p> : (
                <ol className="mt-4 space-y-2 text-sm">
                  {[["پرداخت انجام شد", true], ["بررسی مدارک توسط اکسیر (تا ۲۴ ساعت)", false], ["ثبت در اپراتور و فعال‌سازی", false]].map(([t, ok], i) => <li key={i} className="flex items-center gap-2"><span className={clsx("grid size-5 place-items-center rounded-full text-[11px] text-white", ok ? "bg-sage" : "bg-line")}>{ok ? <Check size={12} /> : fa(i + 1)}</span>{t as string}</li>)}
                </ol>
              )}
            </Card>
          ) : (
            <>
              {acc.line.note && <p className="rounded-xl bg-ambersoft p-3 text-sm text-amber">{acc.line.note}</p>}
              <Card className="p-5">
                <p className="mb-3 text-sm font-bold">چرا شماره‌ی اختصاصی؟</p>
                <ul className="grid gap-2 text-sm text-ink2 sm:grid-cols-2">{["نام و شماره‌ی خودِ سالن روی پیام مشتری می‌نشیند", "مشتری می‌تواند به همان شماره پاسخ دهد", "نرخ تحویل بالاتر؛ بدون تأثیر از تبلیغات سالن‌های دیگر", "اعتماد بیشتر = رزرو و بازگشت بیشتر"].map((t) => <li key={t} className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-sage" />{t}</li>)}</ul>
              </Card>
              <Card>
                <CardHead title="شماره‌ی دلخواه خود را پیدا کنید" hint="چند رقم دلخواه (مثلاً سال تولد، ۰۰۰، یا رقم‌های شانس) را بنویسید" />
                <div className="space-y-4 px-5 pb-5">
                  <label className="relative block max-w-md"><Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={q} onChange={(e) => { setQ(e.target.value); setPick(null); }} inputMode="numeric" dir="ltr" placeholder="مثلاً 1234 یا 800" aria-label="رقم‌های دلخواه شماره" style={{ textAlign: "right" }} className={`${fieldCls} pr-9`} /></label>
                  {digits(q).length >= 2 && (
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {results.map((r) => (
                        <li key={r.number}><button disabled={!r.available} onClick={() => setPick(r.number)} aria-pressed={pick === r.number} className={clsx("w-full rounded-xl border p-3 text-right disabled:cursor-not-allowed disabled:opacity-50", pick === r.number ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line cursor-pointer hover:bg-surface2")}>
                          <bdi dir="ltr" className="block text-lg font-extrabold">{r.number}</bdi>
                          <span className="mt-1 flex items-center justify-between text-xs"><Badge tone={tierTone[r.tier]}>{r.tier}</Badge>{r.available ? <b>{short(r.price)} / سال</b> : <span className="text-ink3">فروخته شده</span>}</span>
                        </button></li>
                      ))}
                    </ul>
                  )}
                  {digits(q).length < 2 && <p className="text-xs text-ink3">حداقل ۲ رقم وارد کنید. شماره‌های رند و زیبا گران‌ترند.</p>}
                </div>
              </Card>
              {picked && (
                <Card>
                  <CardHead title={`خرید ${picked.number}`} hint={`${picked.tier} · ${toman(picked.price)} برای یک سال`} />
                  <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                    <Field label="نام صاحب امتیاز (شخص یا شرکت)"><input value={kyc.holder} onChange={(e) => setKyc({ ...kyc, holder: e.target.value })} className={fieldCls} /></Field>
                    <Field label="کد ملی / شناسه‌ی ملی شرکت"><input value={kyc.idNo} onChange={(e) => setKyc({ ...kyc, idNo: e.target.value })} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line p-3 text-sm sm:col-span-2"><span className="grid size-10 place-items-center rounded-lg bg-surface2 text-ink3">{kyc.doc ? <Check size={18} className="text-sage" /> : "＋"}</span><span className="min-w-0 flex-1"><b className="block">تصویر کارت ملی یا مجوز کسب‌وکار</b><span className="text-xs text-ink3">{kyc.doc ? "بارگذاری شد" : "PNG یا JPG یا PDF"}</span></span><input type="file" accept="image/*,.pdf" className="sr-only" aria-label="مدارک" onChange={(e) => setKyc({ ...kyc, doc: !!e.target.files?.length })} /></label>
                    <Field label="روش پرداخت"><select value={linePay} onChange={(e) => setLinePay(e.target.value as "online" | "wallet")} className={fieldCls}><option value="online">پرداخت آنلاین</option><option value="wallet">کیف پول پورسانت ({short(wallet)})</option></select></Field>
                    {kycErr && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger sm:col-span-2">{kycErr}</p>}
                    <div className="sm:col-span-2"><Button onClick={() => { if (kyc.holder.trim().length < 3) return setKycErr("نام صاحب امتیاز را وارد کنید."); if (!/^\d{10,11}$/.test(digits(kyc.idNo))) return setKycErr("کد ملی (۱۰ رقم) یا شناسه‌ی ملی (۱۱ رقم) معتبر نیست."); if (!kyc.doc) return setKycErr("تصویر مدارک را بارگذاری کنید."); setKycErr(""); const r = sms.buyLine(picked.number, { ...kyc, idNo: digits(kyc.idNo) }, linePay); note(r); if (r.ok) { setPick(null); setQ(""); } }}>پرداخت {toman(picked.price)} و ثبت درخواست</Button></div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === "log" && (
        <div className="space-y-5">
          {queue.length > 0 && (
            <Card>
              <CardHead title="منتظر تأیید شما" hint="با تأیید، پیام ارسال و از اعتبار کسر می‌شود" action={<Button onClick={() => note({ ok: true, msg: `${fa(sms.approveAll())} پیام تأیید و ارسال شد.` })}>تأیید و ارسال همه</Button>} />
              <ul className="divide-y divide-line">
                {queue.slice(0, 10).map((m) => <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-sm"><span className="min-w-0 flex-1 basis-56"><b>{m.name}</b> <span className="text-xs text-ink3">· {scenLabel(m.scenario)}</span><span className="block text-xs leading-6 text-ink2">{m.text}</span></span><Button variant="soft" onClick={() => sms.approve(m.id)}>تأیید</Button><Button variant="ghost" className="!text-danger" onClick={() => sms.reject(m.id)}>رد</Button></li>)}
              </ul>
            </Card>
          )}
          <Card>
            <CardHead title="گزارش ارسال" />
            <div className="flex flex-wrap gap-2 px-5 pb-3"><select aria-label="سناریو" value={fs} onChange={(e) => setFs(e.target.value)} className={`${fieldCls} !w-auto min-w-0 max-w-full !py-1.5`}><option value="all">همه‌ی سناریوها</option>{[...new Set(mine.map((m) => m.scenario))].map((s) => <option key={s} value={s}>{scenLabel(s)}</option>)}</select><select aria-label="وضعیت" value={ft} onChange={(e) => setFt(e.target.value)} className={`${fieldCls} !w-auto min-w-0 max-w-full !py-1.5`}><option value="all">همه‌ی وضعیت‌ها</option>{["ارسال‌شده", "ناموفق", "در انتظار تأیید", "مسدود", "رد شد"].map((s) => <option key={s}>{s}</option>)}</select></div>
            <DataList rows={rows} id={(m) => m.id} cols={[
              { h: "گیرنده", title: true, cell: (m) => <>{m.name} <span className="text-xs font-normal text-ink3">· {m.day === 0 ? "امروز" : dayInfo(m.day).short} {m.time}</span></> },
              { h: "سناریو", cell: (m) => scenLabel(m.scenario) },
              { h: "متن", cell: (m) => <span className="line-clamp-2 text-ink2">{m.text}</span> },
              { h: "بخش", cell: (m) => fa(m.parts) },
              { h: "وضعیت", cell: (m) => <span className="inline-flex flex-col items-end gap-0.5 md:items-start"><Badge tone={statusTone[m.status]}>{m.status}</Badge>{m.reason && <span className="text-[10px] text-ink3">{m.reason}</span>}</span> },
            ]} />
            {!rows.length && <p className="px-5 pb-8 text-center text-sm text-ink3">پیامی با این فیلتر وجود ندارد.</p>}
          </Card>
        </div>
      )}
    </>
  );
}
export { tierOf };
