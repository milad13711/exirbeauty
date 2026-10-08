"use client";
import { useState } from "react";
import { Crown, Plus, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "./ui";
import { crm, type MembershipPlan, type MembershipRow, type PayMethod } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, shortToman, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const STATUS: Record<MembershipRow["status"], { label: string; tone: Tone }> = { ACTIVE: { label: "فعال", tone: "sage" }, EXPIRED: { label: "منقضی", tone: "amber" }, CANCELED: { label: "لغوشده", tone: "danger" } };
const METHODS: [PayMethod, string][] = [["CASH", "نقدی"], ["CARD", "کارت"], ["ONLINE", "آنلاین"]];
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));

type Draft = { id: string | null; name: string; price: string; months: string; credits: string; creditLabel: string; discountPct: string; perks: string; active: boolean };
const blank = (): Draft => ({ id: null, name: "", price: "", months: "1", credits: "1", creditLabel: "", discountPct: "0", perks: "", active: true });

function PlanForm({ d: init, onClose, onSaved }: { d: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(init); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  async function save() {
    setErr(""); setBusy(true);
    try {
      const b = { name: d.name.trim(), price: num(d.price), months: Math.max(1, num(d.months)), credits: num(d.credits), creditLabel: d.creditLabel.trim(), discountPct: Math.min(60, num(d.discountPct)), perks: d.perks.split("\n").map((x) => x.trim()).filter(Boolean), active: d.active };
      if (d.id) await crm.updateMembershipPlan(d.id, b); else await crm.createMembershipPlan(b);
      onSaved(); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title={d.id ? "ویرایش پلن" : "پلن جدید"} onClose={onClose} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نام پلن"><input className={fieldCls} value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="قیمت (تومان)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.price} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="مدت (ماه ۳۰ روزه)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.months} onChange={(e) => set({ months: e.target.value })} /></Field>
        <Field label="تعداد جلسه‌ی همراه"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.credits} onChange={(e) => set({ credits: e.target.value })} /></Field>
        <Field label="عنوان جلسه (مثلاً فیشال)"><input className={fieldCls} value={d.creditLabel} onChange={(e) => set({ creditLabel: e.target.value })} /></Field>
        <Field label="تخفیف خدمات در مدت عضویت (٪)"><input dir="ltr" inputMode="numeric" className={fieldCls} value={d.discountPct} onChange={(e) => set({ discountPct: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="مزایا (هر مورد در یک خط)"><textarea rows={3} className={fieldCls} value={d.perks} onChange={(e) => set({ perks: e.target.value })} /></Field></div>
        <div className="flex items-center gap-3 sm:col-span-2"><Toggle on={d.active} onChange={(v) => set({ active: v })} label="قابل فروش" /><span className="text-sm">{d.active ? "قابل فروش" : "فروش متوقف"}</span></div>
      </div>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={save}>ذخیره</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
    </Modal>
  );
}

function SellModal({ plans, onClose, onSold }: { plans: MembershipPlan[]; onClose: () => void; onSold: () => void }) {
  const [q, setQ] = useState(""); const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? ""); const [method, setMethod] = useState<PayMethod>("CASH"); const [amount, setAmount] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState("");
  const found = useQuery(() => (q.trim().length >= 2 && !customer ? crm.customers({ q: q.trim(), limit: 5 }) : Promise.resolve(null)), [q, customer]);
  const plan = plans.find((p) => p.id === planId);
  const paying = amount === "" ? plan?.price ?? 0 : num(amount);
  async function sell() {
    if (!customer || !plan) return;
    setErr(""); setBusy(true);
    try {
      const r = await crm.sellMembership({ customerId: customer.id, planId, payments: paying > 0 ? [{ method, amount: paying }] : [] });
      setDone(`${r.renewed ? "عضویت تمدید شد" : "عضویت فعال شد"} · فاکتور F-${r.saleNumber}`); onSold();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Modal title="فروش عضویت" onClose={onClose}>
      {done ? <div className="space-y-3"><p className="rounded-xl bg-sagesoft p-3 text-sm text-sage">{done}</p><Button onClick={onClose}>بستن</Button></div> : (
        <div className="space-y-3">
          {customer ? <p className="flex items-center justify-between rounded-xl bg-surface2 p-3 text-sm"><b>{customer.name}</b><button className="cursor-pointer text-xs font-bold text-rose" onClick={() => setCustomer(null)}>تغییر</button></p> : (
            <>
              <Field label="مشتری"><input className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره…" /></Field>
              {found.data && <div className="flex flex-wrap gap-2">{found.data.items.map((c) => <Chip key={c.id} active={false} onClick={() => setCustomer({ id: c.id, name: c.name })}>{c.name}</Chip>)}</div>}
            </>
          )}
          <Field label="پلن"><select className={fieldCls} value={planId} onChange={(e) => setPlanId(e.target.value)}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {toman(p.price)}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="روش پرداخت"><select className={fieldCls} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="مبلغ دریافتی"><input dir="ltr" inputMode="numeric" className={fieldCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(plan?.price ?? 0)} /></Field>
          </div>
          <p className="text-xs text-ink3">با فروش، یک فاکتور در صندوق ثبت می‌شود؛ مبلغ پرداخت‌نشده به‌عنوان بدهی مشتری می‌ماند. اگر مشتری همین پلن را فعال دارد، تمدید می‌شود.</p>
          {err && <ErrorNote message={err} />}
          <Button disabled={busy || !customer || !plan} onClick={sell}>فروش و ثبت فاکتور</Button>
        </div>
      )}
    </Modal>
  );
}

function Board() {
  const me = useMe(); const owner = canManage(me);
  const plans = useQuery(() => crm.membershipPlans(), []);
  const ov = useQuery(() => (owner ? crm.membershipOverview() : Promise.resolve(null)), [owner]);
  const [status, setStatus] = useState<"ACTIVE" | "all">("ACTIVE");
  const list = useQuery(() => crm.memberships(status === "all" ? {} : { status }), [status]);
  const [form, setForm] = useState<Draft | null>(null); const [sell, setSell] = useState(false); const [err, setErr] = useState("");
  const refresh = () => { void plans.reload(); void ov.reload(); void list.reload(); };
  if (plans.loading && !plans.data) return <Spinner />;
  if (!plans.data) return <ErrorNote message={errorText(plans.error)} onRetry={plans.reload} />;
  const sellable = plans.data.filter((p) => p.active);
  async function act(fn: () => Promise<unknown>) { setErr(""); try { await fn(); refresh(); } catch (e) { setErr(errorText(e)); } }
  return (
    <div className="space-y-5">
      <PageTitle title="پکیج و عضویت" sub="درآمد تکرارشونده برای سالن؛ فروش عضویت در صندوق ثبت می‌شود"
        actions={<>{sellable.length > 0 && <Button onClick={() => setSell(true)}>فروش عضویت</Button>}{owner && <Button variant="ghost" onClick={() => setForm(blank())}><Plus size={14} />پلن جدید</Button>}</>} />
      {ov.data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="اعضای فعال" value={faNum(ov.data.activeMembers)} tone="rose" icon={<Crown size={16} />} />
          <Stat label="درآمد ماهانه‌ی تکرارشونده" value={shortToman(ov.data.mrr)} tone="sage" icon={<RefreshCw size={16} />} />
          <Stat label="پلن‌های فعال" value={faNum(ov.data.plans)} tone="gold" />
          <Stat label="جلسه‌های باقی‌مانده" value={faNum(ov.data.sessionsLeft)} tone="sky" />
        </div>
      )}
      {err && <ErrorNote message={err} />}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plans.data.map((p) => (
          <Card key={p.id} className={`flex flex-col p-4 ${p.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2"><h3 className="font-bold">{p.name}</h3>{!p.active && <Badge tone="neutral">متوقف</Badge>}</div>
            <p className="mt-1 text-xl font-extrabold text-rose">{toman(p.price)}</p>
            <p className="text-xs text-ink3">{faNum(p.months)} ماهه{p.credits ? ` · ${faNum(p.credits)} جلسه ${p.creditLabel}` : ""}{p.discountPct ? ` · ${faNum(p.discountPct)}٪ تخفیف خدمات` : ""}</p>
            {p.perks.length > 0 && <ul className="mt-2 flex-1 space-y-0.5 text-xs text-ink2">{p.perks.map((x) => <li key={x}>• {x}</li>)}</ul>}
            {owner && <div className="mt-3 flex gap-2"><Button variant="ghost" onClick={() => setForm({ id: p.id, name: p.name, price: String(p.price), months: String(p.months), credits: String(p.credits), creditLabel: p.creditLabel, discountPct: String(p.discountPct), perks: p.perks.join("\n"), active: p.active })}>ویرایش</Button><Button variant="ghost" className="!text-danger" onClick={() => confirm(`پلن «${p.name}» حذف شود؟ عضویت‌های فروخته‌شده می‌مانند.`) && act(() => crm.archiveMembershipPlan(p.id))}>حذف</Button></div>}
          </Card>
        ))}
        {!plans.data.length && <p className="text-sm text-ink3">هنوز پلنی تعریف نشده است.</p>}
      </div>
      <Card className="p-5">
        <CardHead title="اعضا" action={<div className="flex gap-2"><Chip active={status === "ACTIVE"} onClick={() => setStatus("ACTIVE")}>فعال</Chip><Chip active={status === "all"} onClick={() => setStatus("all")}>همه</Chip></div>} />
        {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <p className="text-sm text-ink3">عضوی ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">
            {list.data.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="min-w-0 flex-1 basis-40"><b>{m.customerName}</b><span className="block text-xs text-ink3">{m.planName} · تا {faDate.short(m.expiryDate)}</span></span>
                <Badge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</Badge>
                <span className="text-xs text-ink2">{faNum(m.credits)} از {faNum(m.creditsTotal)} جلسه{m.creditLabel ? ` ${m.creditLabel}` : ""}</span>
                {m.status === "ACTIVE" && (
                  <span className="flex gap-1.5">
                    <Button variant="soft" disabled={m.credits < 1} onClick={() => act(() => crm.useMembership(m.id))}>ثبت یک جلسه</Button>
                    {owner && <Button variant="ghost" className="!text-danger" onClick={() => confirm("این عضویت لغو شود؟") && act(() => crm.cancelMembership(m.id))}>لغو</Button>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {form && <PlanForm d={form} onClose={() => setForm(null)} onSaved={refresh} />}
      {sell && <SellModal plans={sellable} onClose={() => setSell(false)} onSold={refresh} />}
    </div>
  );
}

export function LiveMemberships() { return <LiveGate><Board /></LiveGate>; }
