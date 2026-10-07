"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, MessageSquare, Send } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type CampaignRow, type CampaignSegment, type Service } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { addDays, faDate, faNum, parseTime, shortToman, todayLocal, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";
import { hasFilter } from "@/server/modules/campaigns/audience"; // pure rule, shared so the form agrees with the server

const TEMPLATES: { l: string; name: string; seg: CampaignSegment; msg: string }[] = [
  { l: "بازگشت مشتری", name: "بازگشت مشتریان", seg: { inactiveDays: 60 }, msg: "{name} جان، دلتنگت شدیم؛ برای برگشتت یک پیشنهاد ویژه داریم: ۱۵٪ تخفیف تا آخر هفته." },
  { l: "تولدهای این ماه", name: "تبریک تولد", seg: { birthdayMonth: true }, msg: "تولدت مبارک {name}! هدیه‌ی ما یک فیشال رایگان است." },
  { l: "مشتریان پرخرید", name: "پیشنهاد مشتریان ویژه", seg: { minSpend: 5_000_000 }, msg: "{name} عزیز، به پاس اعتماد شما یک پیشنهاد ویژه برایتان کنار گذاشته‌ایم." },
];
const STATUS: Record<CampaignRow["status"], { label: string; tone: Tone }> = { SENT: { label: "ارسال‌شده", tone: "sage" }, SCHEDULED: { label: "زمان‌بندی‌شده", tone: "sky" }, SENDING: { label: "در حال ارسال", tone: "amber" }, CANCELED: { label: "لغوشده", tone: "neutral" } };
/** Salon-local (Tehran) date and time of an instant. */
const whenText = (iso: string) => new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const segText = (s: CampaignSegment) => [s.inactiveDays !== undefined && `بیش از ${faNum(s.inactiveDays)} روز غیبت`, s.tiers?.length && `سطح ${s.tiers.join("، ")}`, s.birthdayMonth && "تولد این ماه", s.minSpend !== undefined && `خرید بیش از ${shortToman(s.minSpend)}`, s.service && `خدمت ${s.service}`].filter(Boolean).join(" · ") || "همه";

/** Waits for typing to pause before hitting the server for a preview. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function Composer({ onSent }: { onSent: () => void }) {
  const [name, setName] = useState(""); const [seg, setSeg] = useState<CampaignSegment>({}); const [msg, setMsg] = useState("");
  const [later, setLater] = useState(false); const [date, setDate] = useState(addDays(todayLocal(), 1)); const [time, setTime] = useState("10:00");
  const [err, setErr] = useState(""); const [ok, setOk] = useState(""); const [busy, setBusy] = useState(false);
  const tiers = useQuery(() => crm.loyaltyConfig().then((c) => c.tiers.map((t) => t.name)).catch(() => [] as string[]), []);
  const services = useQuery(() => crm.services({ active: true }).catch(() => [] as Service[]), []);
  const filtered = hasFilter(seg);
  const key = useDebounced(JSON.stringify([seg, msg.trim().length >= 10 ? msg : ""]), 400);
  const prev = useQuery(() => {
    const [s, m] = JSON.parse(key) as [CampaignSegment, string];
    return hasFilter(s) ? crm.campaignPreview(s, m || "پیام آزمایشی برای محاسبه‌ی هزینه") : Promise.resolve(null);
  }, [key]);
  const p = filtered ? prev.data : null;
  const set = (patch: Partial<CampaignSegment>) => { setSeg((s) => { const n = { ...s, ...patch }; for (const k of Object.keys(n) as (keyof CampaignSegment)[]) if (n[k] === undefined) delete n[k]; return n; }); setOk(""); };

  async function send() {
    setErr(""); setOk("");
    if (name.trim().length < 3) return setErr("نام کمپین را وارد کنید.");
    if (msg.trim().length < 10) return setErr("متن پیام را کامل بنویسید.");
    if (!filtered) return setErr("حداقل یک شرط برای انتخاب مخاطب تعیین کنید.");
    const minute = parseTime(time);
    if (later && minute === null) return setErr("ساعت ارسال معتبر نیست.");
    setBusy(true);
    try {
      const r = await crm.createCampaign({ name: name.trim(), message: msg.trim(), segment: seg, ...(later ? { sendAt: { date, minute: minute! } } : {}) });
      setOk(r.status === "SENT" ? `پیامک برای ${faNum(r.sentCount)} نفر ارسال شد${r.skippedCount ? ` · ${faNum(r.skippedCount)} نفر به‌دلیل سقف پیام یا نبود اعتبار رد شدند` : ""}${r.failedCount ? ` · ${faNum(r.failedCount)} ناموفق (اعتبار برگشت خورد)` : ""}.` : `کمپین برای ${faNum(r.audienceCount)} نفر زمان‌بندی شد.`);
      setName(""); setMsg(""); setSeg({}); onSent();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-5">
        <Card className="p-5">
          <CardHead title="قالب‌های آماده" />
          <div className="flex flex-wrap gap-2">{TEMPLATES.map((t) => <Chip key={t.l} active={false} onClick={() => { setName(t.name); setSeg(t.seg); setMsg(t.msg); setOk(""); }}>{t.l}</Chip>)}</div>
        </Card>
        <Card className="p-5">
          <CardHead title="۱. مخاطبان" hint="شرط‌ها با هم ترکیب می‌شوند (و)" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="مراجعه نکرده‌اند بیش از (روز)"><input type="number" min={1} value={seg.inactiveDays ?? ""} onChange={(e) => set({ inactiveDays: e.target.value === "" ? undefined : Math.max(1, +e.target.value) })} placeholder="مثلاً ۶۰" className={fieldCls} /></Field>
            <Field label="حداقل مجموع خرید (تومان)"><input type="number" min={0} step={100000} value={seg.minSpend ?? ""} onChange={(e) => set({ minSpend: e.target.value === "" ? undefined : Math.max(0, +e.target.value) })} className={fieldCls} /></Field>
            <Field label="خدمتی که گرفته‌اند"><select value={seg.service ?? ""} onChange={(e) => set({ service: e.target.value || undefined })} className={fieldCls}><option value="">همه</option>{[...new Set(services.data?.map((s) => s.name))].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-xl border border-line px-3 py-2.5 text-sm"><input type="checkbox" checked={!!seg.birthdayMonth} onChange={(e) => set({ birthdayMonth: e.target.checked || undefined })} className="size-4 accent-[#b4536f]" />متولدین این ماه</label>
            {!!tiers.data?.length && (
              <fieldset className="sm:col-span-2"><legend className="mb-1.5 text-xs font-semibold text-ink2">سطح باشگاه</legend>
                <div className="flex flex-wrap gap-2">{tiers.data.map((t) => { const on = seg.tiers?.includes(t) ?? false; return <Chip key={t} active={on} onClick={() => { const cur = seg.tiers ?? []; const n = on ? cur.filter((x) => x !== t) : [...cur, t]; set({ tiers: n.length ? n : undefined }); }}>{t}</Chip>; })}</div>
              </fieldset>
            )}
            <p className="rounded-xl bg-sagesoft p-3 text-sm text-sage sm:col-span-2">{!filtered ? "برای دیدن تعداد مخاطب، حداقل یک شرط تعیین کنید." : !p ? "در حال محاسبه…" : <>مخاطبان: <b>{faNum(p.count)} نفر</b>{p.sample.length > 0 && <span className="text-ink2"> — {p.sample.slice(0, 3).join("، ")}{p.count > 3 ? " و …" : ""}</span>}{p.tooMany && <span className="text-danger"> · بیش از ۵۰۰ نفر؛ شرط‌ها را محدودتر کنید</span>}</>}</p>
          </div>
        </Card>
        <Card className="space-y-3 p-5">
          <CardHead title="۲. پیام و ارسال" />
          <Field label="نام کمپین"><input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} /></Field>
          <Field label="متن پیام ({name} با نام کوچک مشتری جایگزین می‌شود)"><textarea rows={4} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} className={`${fieldCls} leading-7`} /></Field>
          <div className="flex flex-wrap items-center gap-2"><Chip active={!later} onClick={() => setLater(false)}>همین حالا</Chip><Chip active={later} onClick={() => setLater(true)}>زمان‌بندی</Chip>
            {later && <><input type="date" value={date} min={todayLocal()} onChange={(e) => setDate(e.target.value)} dir="ltr" className={`${fieldCls} !w-auto`} /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" className={`${fieldCls} !w-auto`} /></>}</div>
          {err && <ErrorNote message={err} />}
          {ok && <p role="status" className="rounded-xl bg-sagesoft p-2.5 text-sm text-sage">{ok}</p>}
          {p && <p className={`rounded-xl p-2.5 text-xs leading-6 ${p.enough ? "bg-surface2 text-ink2" : "bg-ambersoft text-amber"}`}>هزینه: <b>{toman(p.cost)}</b> · اعتبار شما {toman(p.balance)}{!p.enough && <> — اعتبار کافی نیست. <Link href="/sms" className="font-bold underline">شارژ</Link></>}. به هر مشتری حداکثر ۲ پیام کمپین در ۳۰ روز می‌رسد.</p>}
          <Button disabled={busy || !filtered || !p?.count} onClick={send}><Send size={14} />{later ? "زمان‌بندی" : "ارسال"}{p ? ` به ${faNum(p.count)} نفر` : ""}</Button>
        </Card>
      </div>
      <Card className="p-5 lg:sticky lg:top-20">
        <CardHead title="پیش‌نمایش" action={<MessageSquare size={16} className="text-ink3" />} />
        <div className="min-h-24 rounded-2xl rounded-br-sm bg-sagesoft p-4 text-sm leading-7">{msg.trim() ? msg.replace(/\{name\}/g, p?.sample[0]?.split(" ")[0] ?? "سارا") : <span className="text-ink3">متن پیام اینجا نمایش داده می‌شود…</span>}</div>
      </Card>
    </div>
  );
}

function History({ tick }: { tick: number }) {
  const q = useQuery(crm.campaigns, [tick]);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  async function cancel(id: string) {
    setErr("");
    try { await crm.cancelCampaign(id); await q.reload(); } catch (e) { setErr(errorText(e)); }
  }
  return (
    <Card className="p-5">
      <CardHead title="کمپین‌های قبلی" />
      {err && <div className="mb-3"><ErrorNote message={err} /></div>}
      {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">هنوز کمپینی ساخته نشده است.</p> : (
        <ul className="divide-y divide-line">
          {q.data.map((c) => (
            <li key={c.id}>
              <button onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 py-3 text-right">
                <span className="min-w-0 flex-1 basis-40"><b className="block text-sm">{c.name}</b><span className="text-xs text-ink3">{c.sentAt ? faDate.short(c.sentAt.slice(0, 10)) : c.scheduledFor ? `${faDate.short(c.scheduledFor.slice(0, 10))}` : ""} · {segText(c.segment)}</span></span>
                <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge><span className="text-xs text-ink2">{faNum(c.status === "SENT" ? c.sentCount : c.audienceCount)} نفر</span><ChevronDown size={15} className={`text-ink3 transition-transform ${open === c.id ? "rotate-180" : ""}`} />
              </button>
              {open === c.id && (
                <div className="space-y-2 rounded-xl bg-surface2/50 px-4 py-3 text-sm">
                  <p className="leading-7">{c.message}</p>
                  {c.status === "SENT" && <p className="text-xs text-ink2">ارسال‌شده {faNum(c.sentCount)} · ناموفق {faNum(c.failedCount)} · ردشده {faNum(c.skippedCount)}{c.revenue ? ` · فروش ۵ روز بعد: ${toman(c.revenue)} از ${faNum(c.buyers ?? 0)} نفر` : ""}</p>}
                  {c.status === "SCHEDULED" && c.scheduledFor && <p className="text-xs text-ink2">ارسال: {whenText(c.scheduledFor)}</p>}
                  {c.status === "SCHEDULED" && <Button variant="ghost" className="!text-danger" onClick={() => cancel(c.id)}>لغو کمپین</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Hub() {
  const me = useMe();
  const [tick, setTick] = useState(0);
  if (!canManage(me)) return <Card className="p-6 text-sm text-ink2">کمپین‌ها فقط برای مالک سالن در دسترس است.</Card>;
  return (
    <div className="space-y-5">
      <PageTitle title="کمپین و بازاریابی" sub="مخاطب را با شرط انتخاب کنید، پیام را بنویسید، ارسال یا زمان‌بندی کنید" />
      <Composer onSent={() => setTick((n) => n + 1)} />
      <History tick={tick} />
    </div>
  );
}

export function LiveCampaigns() { return <LiveGate><Hub /></LiveGate>; }
