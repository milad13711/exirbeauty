"use client";
import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type GiftIssued, type PayMethod } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, shortToman, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const OCCASIONS = ["تولد", "عروسی", "روز مادر", "بدون مناسبت"];
const AMOUNTS = [500_000, 1_000_000, 2_000_000, 5_000_000];
const METHODS: [PayMethod, string][] = [["CASH", "نقدی"], ["CARD", "کارت"], ["ONLINE", "آنلاین"]];
const STATUS: Record<string, { label: string; tone: Tone }> = { ACTIVE: { label: "فعال", tone: "sage" }, USED: { label: "استفاده‌شده", tone: "neutral" }, VOID: { label: "باطل", tone: "danger" } };
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));

function Issue({ onIssued }: { onIssued: () => void }) {
  const [q, setQ] = useState(""); const [buyer, setBuyer] = useState<{ id: string; name: string } | null>(null);
  const [fromName, setFromName] = useState(""); const [toName, setToName] = useState(""); const [toPhone, setToPhone] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0]); const [message, setMessage] = useState("");
  const [amount, setAmount] = useState(2_000_000); const [method, setMethod] = useState<PayMethod>("CARD");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<GiftIssued | null>(null); const [copied, setCopied] = useState(false);
  const found = useQuery(() => (q.trim().length >= 2 && !buyer ? crm.customers({ q: q.trim(), limit: 5 }) : Promise.resolve(null)), [q, buyer]);

  async function submit() {
    setErr(""); setMade(null);
    if (!buyer && fromName.trim().length < 2) return setErr("نام خریدار را وارد یا انتخاب کنید.");
    if (toName.trim().length < 2) return setErr("نام گیرنده را وارد کنید.");
    setBusy(true);
    try {
      const r = await crm.issueGiftCard({ buyerId: buyer?.id ?? null, fromName: fromName.trim(), toName: toName.trim(), toPhone: toPhone.trim(), occasion, message: message.trim(), amount, payments: [{ method, amount }] });
      setMade(r); setToName(""); setToPhone(""); setMessage(""); onIssued();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="space-y-3 p-5">
      <CardHead title="صدور کارت هدیه" hint="مبلغ همین حالا دریافت و در صندوق ثبت می‌شود" />
      {buyer ? <p className="flex items-center justify-between rounded-xl bg-surface2 p-3 text-sm"><span>خریدار: <b>{buyer.name}</b></span><button className="cursor-pointer text-xs font-bold text-rose" onClick={() => setBuyer(null)}>تغییر</button></p> : (
        <>
          <Field label="خریدار (مشتری سالن)"><input className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی مشتری…" /></Field>
          {found.data && <div className="flex flex-wrap gap-2">{found.data.items.map((c) => <Chip key={c.id} active={false} onClick={() => setBuyer({ id: c.id, name: c.name })}>{c.name}</Chip>)}</div>}
          <Field label="یا فقط نام خریدار"><input className={fieldCls} value={fromName} onChange={(e) => setFromName(e.target.value)} /></Field>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام گیرنده"><input className={fieldCls} value={toName} onChange={(e) => setToName(e.target.value)} /></Field>
        <Field label="موبایل گیرنده (کد پیامک می‌شود)"><input dir="ltr" inputMode="tel" className={fieldCls} value={toPhone} onChange={(e) => setToPhone(e.target.value)} placeholder="09…" /></Field>
      </div>
      <div className="flex flex-wrap gap-2">{OCCASIONS.map((o) => <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>{o}</Chip>)}</div>
      <Field label="پیام همراه (اختیاری)"><textarea rows={2} maxLength={300} className={fieldCls} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      <div className="flex flex-wrap items-center gap-2">{AMOUNTS.map((a) => <Chip key={a} active={amount === a} onClick={() => setAmount(a)}>{shortToman(a)}</Chip>)}<input dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(num(e.target.value))} className={`${fieldCls} !w-36 !min-h-9`} aria-label="مبلغ دلخواه" /></div>
      <div className="flex flex-wrap gap-2"><span className="self-center text-xs text-ink3">روش دریافت:</span>{METHODS.map(([k, l]) => <Chip key={k} active={method === k} onClick={() => setMethod(k)}>{l}</Chip>)}</div>
      {err && <ErrorNote message={err} />}
      <Button disabled={busy} onClick={submit}><Gift size={14} />{busy ? "در حال صدور…" : `صدور کارت ${toman(amount)}`}</Button>
      {made && (
        <div className="space-y-2 rounded-2xl border border-gold/50 bg-goldsoft p-4 text-sm" role="status">
          <p className="font-extrabold">کارت هدیه برای {made.toName} صادر شد · فاکتور F-{made.saleNumber}</p>
          <div className="flex items-center gap-2"><code dir="ltr" className="rounded-lg bg-surface px-3 py-2 text-base font-extrabold tracking-wider">{made.code}</code><Button variant="soft" onClick={() => { navigator.clipboard?.writeText(made.code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? <Check size={14} /> : <Copy size={14} />}کپی</Button></div>
          <p className="text-xs text-ink2">{made.smsSent ? "کد برای گیرنده پیامک شد." : "پیامک ارسال نشد (ماژول یا اعتبار پیامک)؛ کد را خودتان به گیرنده بدهید."} این کد فقط همین یک‌بار کامل نمایش داده می‌شود.</p>
        </div>
      )}
    </Card>
  );
}

function Lookup() {
  const [code, setCode] = useState(""); const [res, setRes] = useState<{ balance: number; status: string; toName: string; last4: string } | null>(null); const [err, setErr] = useState("");
  async function check() { setErr(""); setRes(null); try { setRes(await crm.lookupGiftCard(code.trim())); } catch (e) { setErr(errorText(e)); } }
  return (
    <Card className="space-y-3 p-5">
      <CardHead title="استعلام موجودی" hint="کد را از گیرنده بگیرید؛ برای خرج‌کردن در صندوق «کارت هدیه» را به‌عنوان روش پرداخت انتخاب کنید" />
      <div className="flex gap-2"><input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" className={fieldCls} /><Button disabled={code.trim().length < 8} onClick={check}>بررسی</Button></div>
      {err && <ErrorNote message={err} />}
      {res && <p className="rounded-xl bg-surface2 p-3 text-sm">کارت {res.toName} (…{res.last4}) · <Badge tone={STATUS[res.status]?.tone ?? "neutral"}>{STATUS[res.status]?.label ?? res.status}</Badge> · موجودی <b>{toman(res.balance)}</b></p>}
    </Card>
  );
}

function Board() {
  const me = useMe(); const owner = canManage(me);
  const ov = useQuery(() => (owner ? crm.giftOverview() : Promise.resolve(null)), [owner]);
  const list = useQuery(() => (owner ? crm.giftCards() : Promise.resolve([])), [owner]);
  const refresh = () => { void ov.reload(); void list.reload(); };
  return (
    <div className="space-y-5">
      <PageTitle title="کارت هدیه" sub="فروش در صندوق ثبت می‌شود؛ درآمد هنگام خرج‌کردن حساب می‌شود، نه هنگام فروش" />
      {ov.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="کارت‌های صادرشده" value={faNum(ov.data.issued)} tone="rose" icon={<Gift size={16} />} />
          <Stat label="تعهد باقی‌مانده (فعال)" value={shortToman(ov.data.outstanding)} tone="amber" />
          <Stat label="فروش کل" value={shortToman(ov.data.sold)} tone="sage" />
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2"><Issue onIssued={refresh} /><Lookup /></div>
      {owner && (
        <Card className="p-5">
          <CardHead title="کارت‌های صادرشده" hint="کد کامل برای امنیت ذخیره نمی‌شود؛ فقط ۴ رقم آخر دیده می‌شود" />
          {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <p className="text-sm text-ink3">هنوز کارتی صادر نشده است.</p> : (
            <ul className="divide-y divide-line text-sm">
              {list.data.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 flex-1 basis-40"><b>{g.toName}</b><span className="block text-xs text-ink3">از {g.fromName} · {g.occasion || "—"} · {faDate.short(g.createdAt.slice(0, 10))} · …{g.last4}</span></span>
                  <Badge tone={STATUS[g.status]?.tone ?? "neutral"}>{STATUS[g.status]?.label ?? g.status}</Badge>
                  <span className="text-xs text-ink2">{toman(g.balance)} از {toman(g.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export function LiveGiftCards() { return <LiveGate><Board /></LiveGate>; }
