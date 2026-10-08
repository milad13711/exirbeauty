"use client";
import { useState } from "react";
import { AlertTriangle, Send, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type SmsKind, type SmsMessage, type SmsScenario } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";
import { parts, render } from "@/server/modules/sms/text"; // pure helpers, shared so the preview counts exactly like the server

const KIND: Record<SmsKind, string> = { MANUAL: "دستی", CONFIRM: "تأیید نوبت", MOVED: "جابه‌جایی", CANCEL: "لغو نوبت", REMINDER_24: "یادآوری ۲۴ساعته", REMINDER_2: "یادآوری ۲ساعته", THANKS: "تشکر", BIRTHDAY: "تولد", CAMPAIGN: "کمپین", REVIEW: "درخواست نظر" };
const STATUS: Record<SmsMessage["status"], { label: string; tone: Tone }> = { SENT: { label: "ارسال‌شده", tone: "sage" }, FAILED: { label: "ناموفق", tone: "danger" }, BLOCKED: { label: "نبود اعتبار", tone: "amber" }, QUEUED: { label: "در صف", tone: "neutral" } };
const SAMPLE: Record<string, string> = { name: "سارا", salon: "سالن شما", service: "رنگ ریشه", staff: "مریم", date: "۱۵ مهر", time: "۱۰:۳۰" };
type Tab = "credit" | "scenarios" | "send" | "history";

function Credit() {
  const me = useMe();
  const acc = useQuery(crm.smsAccount, []);
  const pk = useQuery(crm.smsPackages, []);
  const st = useQuery(() => crm.smsStats(30), []);
  const tx = useQuery(crm.smsTransactions, []);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  if (acc.loading && !acc.data) return <Spinner />;
  if (!acc.data) return <ErrorNote message={errorText(acc.error)} onRetry={acc.reload} />;
  const a = acc.data;
  async function buy(id: string) {
    setErr(""); setBusy(id);
    try { window.location.assign((await crm.smsTopup(id)).paymentUrl); } catch (e) { setErr(errorText(e)); setBusy(""); }
  }
  return (
    <div className="space-y-4">
      {a.low && <p className="flex items-center gap-2 rounded-xl bg-ambersoft p-3 text-sm font-semibold text-amber"><AlertTriangle size={16} />اعتبار پیامک رو به پایان است؛ با اتمام آن، پیام‌های خودکار ارسال نمی‌شوند.</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="اعتبار فعلی" value={toman(a.balance)} icon={<Wallet size={16} />} tone={a.low ? "amber" : "sage"} />
        <Stat label="هزینه هر پیامک" value={toman(a.pricing.sell)} sub="برای هر ۷۰ کاراکتر" />
        <Stat label="ارسال ۳۰ روز اخیر" value={faNum(st.data?.sent ?? 0)} sub={st.data ? `${faNum(st.data.failed)} ناموفق · ${faNum(st.data.blocked)} بدون اعتبار` : undefined} />
        <Stat label="هزینه ۳۰ روز اخیر" value={toman(st.data?.spend ?? 0)} />
      </div>
      {canManage(me) && (
        <Card className="p-5">
          <CardHead title="شارژ اعتبار" hint="پرداخت امن با درگاه؛ اعتبار بلافاصله اضافه می‌شود" />
          {err && <div className="mb-3"><ErrorNote message={err} /></div>}
          <div className="grid gap-3 sm:grid-cols-3">
            {pk.data?.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line p-4">
                <p className="font-extrabold text-ink">{p.name}</p>
                <p className="mt-1 text-[22px] font-extrabold text-rose">{toman(p.price)}</p>
                <p className="text-xs text-ink3">{p.bonusPct ? `${faNum(p.bonusPct)}٪ هدیه · اعتبار ${toman(Math.round(p.price * (1 + p.bonusPct / 100)))}` : `اعتبار ${toman(p.price)}`}</p>
                <Button className="mt-3 w-full" disabled={!!busy} onClick={() => buy(p.id)}>{busy === p.id ? "در حال انتقال…" : "خرید"}</Button>
              </div>
            ))}
            {pk.data && !pk.data.length && <p className="text-sm text-ink3">فعلاً بسته‌ای تعریف نشده است.</p>}
          </div>
        </Card>
      )}
      {canManage(me) && (
        <Card className="p-5">
          <CardHead title="گردش اعتبار" />
          {tx.data?.length ? (
            <ul className="divide-y divide-line text-sm">
              {tx.data.slice(0, 15).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-ink2">{{ TOPUP: "شارژ", BONUS: "هدیه شارژ", SEND: "ارسال پیامک", REFUND: "بازگشت (ارسال ناموفق)", ADJUST: "اصلاح توسط پشتیبانی" }[t.kind]}{t.note ? ` — ${t.note}` : ""}<span className="mr-2 text-xs text-ink3">{faDate.short(t.createdAt.slice(0, 10))}</span></span>
                  <span className={t.delta > 0 ? "font-bold text-sage" : "text-ink2"}>{t.delta > 0 ? "+" : ""}{toman(t.delta)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink3">هنوز تراکنشی ثبت نشده است.</p>}
        </Card>
      )}
    </div>
  );
}

function ScenarioCard({ s, canEdit, onSaved }: { s: SmsScenario; canEdit: boolean; onSaved: () => void }) {
  const [text, setText] = useState(s.template); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== s.template;
  const preview = render(text, SAMPLE);
  async function save(p: { enabled?: boolean; template?: string }) {
    setErr(""); setBusy(true);
    try { await crm.smsPutScenario(s.kind, p); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-extrabold text-ink">{s.title}</p><p className="text-xs text-ink3">متغیرها: {s.vars.map((v) => `{${v}}`).join("  ")}</p></div>
        <Toggle on={s.enabled} onChange={(v) => canEdit && save({ enabled: v })} label={`فعال‌سازی ${s.title}`} />
      </div>
      <textarea className={`${fieldCls} mt-3 min-h-24`} value={text} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} maxLength={500} />
      <p className="mt-2 rounded-xl bg-surface2 p-3 text-[13px] leading-6 text-ink2">{preview}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink3">
        <span>{faNum([...preview].length)} کاراکتر · {faNum(parts(preview))} پیامک</span>
        {canEdit && dirty && <Button disabled={busy} onClick={() => save({ template: text })}>ذخیره متن</Button>}
      </div>
      {err && <div className="mt-2"><ErrorNote message={err} /></div>}
    </Card>
  );
}
function Scenarios() {
  const me = useMe();
  const sc = useQuery(crm.smsScenarios, []);
  if (sc.loading && !sc.data) return <Spinner />;
  if (!sc.data) return <ErrorNote message={errorText(sc.error)} onRetry={sc.reload} />;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {sc.data.map((s) => <ScenarioCard key={`${s.kind}-${s.template}-${s.enabled}`} s={s} canEdit={canManage(me)} onSaved={sc.reload} />)}
    </div>
  );
}

function SendManual({ onSent }: { onSent: () => void }) {
  const [q, setQ] = useState(""); const [pick, setPick] = useState<{ id: string; name: string } | null>(null);
  const [phone, setPhone] = useState(""); const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [busy, setBusy] = useState(false);
  const found = useQuery(() => (q.trim().length >= 2 && !pick ? crm.customers({ q: q.trim(), limit: 6 }) : Promise.resolve(null)), [q, pick]);
  async function send() {
    setMsg(null); setBusy(true);
    try {
      await crm.smsSend(pick ? { customerId: pick.id, text } : { phone, text });
      setMsg({ ok: true, text: "پیامک ارسال شد." }); setText(""); onSent();
    } catch (e) { setMsg({ ok: false, text: errorText(e) }); } finally { setBusy(false); }
  }
  return (
    <Card className="max-w-xl space-y-3 p-5">
      <CardHead title="ارسال پیامک تکی" hint="هزینه از اعتبار شما کسر می‌شود" />
      {pick ? (
        <p className="flex items-center justify-between rounded-xl bg-surface2 p-3 text-sm"><span>به: <b>{pick.name}</b></span><button className="cursor-pointer text-xs font-bold text-rose" onClick={() => setPick(null)}>تغییر</button></p>
      ) : (
        <>
          <Field label="جست‌وجوی مشتری"><input className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره…" /></Field>
          {found.data && <div className="flex flex-wrap gap-2">{found.data.items.map((c) => <Chip key={c.id} active={false} onClick={() => setPick({ id: c.id, name: c.name })}>{c.name}</Chip>)}</div>}
          <Field label="یا شماره‌ی موبایل"><input dir="ltr" className={fieldCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09…" inputMode="tel" /></Field>
        </>
      )}
      <Field label="متن پیام"><textarea className={`${fieldCls} min-h-28`} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} /></Field>
      <p className="text-xs text-ink3">{faNum([...text].length)} کاراکتر · {faNum(parts(text || " "))} پیامک</p>
      {msg && (msg.ok ? <p className="rounded-xl bg-sagesoft p-3 text-sm text-sage">{msg.text}</p> : <ErrorNote message={msg.text} />)}
      <Button disabled={busy || !text.trim() || (!pick && !phone.trim())} onClick={send}><Send size={15} />ارسال</Button>
    </Card>
  );
}

function History({ tick }: { tick: number }) {
  const [status, setStatus] = useState("");
  const list = useQuery(() => crm.smsMessages({ status: status || undefined, limit: 100 }), [status, tick]);
  return (
    <Card className="p-5">
      <CardHead title="تاریخچه پیام‌ها" />
      <div className="mb-3 flex flex-wrap gap-2">
        {[["", "همه"], ["SENT", "ارسال‌شده"], ["FAILED", "ناموفق"], ["BLOCKED", "نبود اعتبار"]].map(([v, l]) => <Chip key={v} active={status === v} onClick={() => setStatus(v)}>{l}</Chip>)}
      </div>
      {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <p className="text-sm text-ink3">پیامی وجود ندارد.</p> : (
        <ul className="divide-y divide-line">
          {list.data.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2"><Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge><Badge>{KIND[m.kind]}</Badge><span dir="ltr" className="text-xs text-ink3">{m.phone}</span><span className="mr-auto text-xs text-ink3">{faDate.short(m.createdAt.slice(0, 10))} · {faNum(m.parts)} پیامک{m.cost ? ` · ${toman(m.cost)}` : ""}</span></div>
              <p className="mt-1 leading-6 text-ink2">{m.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Hub({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<Tab>((["credit", "scenarios", "send", "history"] as const).find((t) => t === initialTab) ?? "credit");
  const [tick, setTick] = useState(0);
  const tabs: [Tab, string][] = [["credit", "اعتبار و شارژ"], ["scenarios", "سناریوهای خودکار"], ["send", "ارسال دستی"], ["history", "تاریخچه"]];
  return (
    <div className="space-y-4">
      <PageTitle title="پیامک" sub="اعتبار پیش‌پرداخت، پیام‌های خودکار نوبت و ارسال دستی" />
      <div className="flex flex-wrap gap-2">{tabs.map(([t, l]) => <Chip key={t} active={tab === t} onClick={() => setTab(t)}>{l}</Chip>)}</div>
      {tab === "credit" && <Credit />}
      {tab === "scenarios" && <Scenarios />}
      {tab === "send" && <SendManual onSent={() => setTick((n) => n + 1)} />}
      {tab === "history" && <History tick={tick} />}
    </div>
  );
}

export function LiveSms({ initialTab }: { initialTab?: string }) {
  return <LiveGate><Hub initialTab={initialTab} /></LiveGate>;
}
