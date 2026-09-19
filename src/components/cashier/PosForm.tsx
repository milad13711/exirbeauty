"use client";
import { useState } from "react";
import clsx from "clsx";
import { AlertTriangle, Gift, Minus, Plus, Search, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, fieldCls, tierTone } from "@/components/ui";
import { useDB, type Customer } from "@/lib/db";
import { sales, tierOff } from "@/lib/sales";
import type { PayMethod, SaleLine } from "@/lib/seed-extra";
import { digits } from "@/lib/validate";
import { fa, short, toman } from "@/lib/fa";

const methods: PayMethod[] = ["نقدی", "کارت", "آنلاین", "کیف پول", "کارت هدیه"];
type Pay = { method: PayMethod; amount: number; ref?: string };

export function PosForm({ apptId, onDone }: { apptId?: string; onDone: (id: string, earned: number) => void }) {
  const db = useDB();
  const appt = apptId ? db.appts.find((a) => a.id === apptId) : undefined;
  const apptSvc = appt ? db.services.find((s) => s.name === appt.service) : undefined;

  const [custId, setCustId] = useState<string | null>(appt?.customerId ?? null);
  const [guest, setGuest] = useState(appt && !appt.customerId ? appt.client : "");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<SaleLine[]>(apptSvc ? [{ kind: "service", refId: apptSvc.id, name: apptSvc.name, qty: 1, price: apptSvc.price, staffId: appt!.staffId, commissionPct: apptSvc.commission }] : []);
  const [svcPick, setSvcPick] = useState(db.services.find((s) => s.active)?.id ?? "");
  const [prodPick, setProdPick] = useState(db.inv.find((x) => x.kind === "retail")?.id ?? "");
  const [discount, setDiscount] = useState(0);
  const [pays, setPays] = useState<Pay[]>([]);
  const [err, setErr] = useState("");

  const cust: Customer | undefined = db.customers.find((c) => c.id === custId);
  const closed = sales.isClosed(db, 0);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const off = Math.round((subtotal * discount) / 100);
  const total = subtotal - off;
  const paid = pays.reduce((a, p) => a + p.amount, 0);
  const left = total - paid;
  const tierPct = cust ? tierOff(db.loyalty, cust.tier) : 0;
  const friendPct = cust && cust.visits === 0 && cust.referredBy && db.referral.enabled ? db.referral.friendOff : 0;
  const matches = q.trim() ? db.customers.filter((c) => c.name.includes(q.trim()) || digits(c.phone).replace(/\s/g, "").includes(digits(q.trim()))).slice(0, 5) : [];

  const addService = () => {
    const s = db.services.find((x) => x.id === svcPick); if (!s) return;
    const staffId = (cust && db.staff.find((m) => m.name === cust.favStaff && s.staff.includes(m.id))?.id) ?? s.staff[0];
    setLines([...lines, { kind: "service", refId: s.id, name: s.name, qty: 1, price: s.price, staffId, commissionPct: s.commission }]);
  };
  const addProduct = () => {
    const p = db.inv.find((x) => x.id === prodPick); if (!p) return;
    const ex = lines.findIndex((l) => l.kind === "product" && l.refId === p.id);
    if (ex >= 0) return setLines(lines.map((l, i) => (i === ex ? { ...l, qty: Math.min(p.stock, l.qty + 1) } : l)));
    if (p.stock <= 0) return setErr(`«${p.name}» موجود نیست.`);
    setLines([...lines, { kind: "product", refId: p.id, name: p.name, qty: 1, price: p.price }]);
  };
  const setQty = (i: number, d: number) => setLines(lines.map((l, j) => { if (j !== i) return l; const max = l.kind === "product" ? db.inv.find((x) => x.id === l.refId)?.stock ?? 1 : 9; return { ...l, qty: Math.min(max, Math.max(1, l.qty + d)) }; }));
  const quick = (m: PayMethod) => setPays([{ method: m, amount: total }]);

  const submit = () => {
    setErr("");
    if (closed) return setErr("روز جاری بسته شده است؛ ابتدا آن را بازگشایی کنید.");
    if (!lines.length) return setErr("حداقل یک خدمت یا محصول اضافه کنید.");
    if (lines.some((l) => l.kind === "service" && !l.staffId)) return setErr("برای هر خدمت متخصص را مشخص کنید.");
    if (pays.some((p) => p.amount <= 0)) return setErr("مبلغ هر پرداخت باید بیشتر از صفر باشد.");
    if (paid > total) return setErr("مجموع پرداخت‌ها از مبلغ فاکتور بیشتر است.");
    if (left > 0 && !cust) return setErr("برای ثبت بدهی باید مشتری را انتخاب کنید. یا مبلغ را کامل دریافت کنید.");
    const w = pays.filter((p) => p.method === "کیف پول").reduce((a, p) => a + p.amount, 0);
    if (w > 0 && (!cust || w > cust.wallet)) return setErr("موجودی کیف پول مشتری کافی نیست.");
    for (const p of pays.filter((x) => x.method === "کارت هدیه")) {
      const g = db.giftCards.find((x) => x.code === (p.ref ?? "").trim().toUpperCase());
      if (!g || g.status !== "فعال") return setErr("کد کارت هدیه معتبر و فعال نیست.");
      if (p.amount > g.balance) return setErr(`موجودی کارت هدیه ${toman(g.balance)} است.`);
    }
    const r = sales.createSale({ customerId: custId, customerName: cust?.name ?? (guest.trim() || "مهمان"), lines, discountPct: discount, pays: pays.map((p) => ({ ...p, ref: p.ref?.trim().toUpperCase() })), apptId });
    onDone(r.id, r.earned);
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-5">
        {closed && <p role="alert" className="flex items-center gap-2 rounded-2xl bg-dangersoft p-4 text-sm text-danger"><AlertTriangle size={18} />روز جاری بسته شده است و فاکتور جدید ثبت نمی‌شود.</p>}
        <Card>
          <CardHead title="مشتری" />
          <div className="space-y-3 px-5 pb-5">
            {cust ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                <Avatar name={cust.name} size={40} />
                <div className="min-w-0 flex-1"><b className="block">{cust.name}</b><span className="text-xs text-ink3">{fa(cust.points)} امتیاز · کیف پول {toman(cust.wallet)}</span></div>
                <Badge tone={tierTone[cust.tier]}>{cust.tier}</Badge>
                <Button variant="ghost" onClick={() => { setCustId(null); setPays([]); }}>تغییر</Button>
                {cust.debt > 0 && <p className="w-full rounded-lg bg-ambersoft p-2 text-xs text-amber">این مشتری {toman(cust.debt)} بدهی پرداخت‌نشده دارد.</p>}
                {cust.allergies.length > 0 && <p className="w-full rounded-lg bg-dangersoft p-2 text-xs text-danger">⚠️ {cust.allergies.join(" · ")}</p>}
              </div>
            ) : (
              <>
                <label className="relative block"><Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3" /><input value={q} onChange={(e) => setQ(e.target.value)} aria-label="جستجوی مشتری" placeholder="نام یا موبایل مشتری…" className={`${fieldCls} pr-9`} /></label>
                {matches.length > 0 && <ul className="space-y-1.5">{matches.map((c) => <li key={c.id}><button onClick={() => { setCustId(c.id); setQ(""); }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-right hover:bg-surface2"><Avatar name={c.name} size={30} /><span className="min-w-0 flex-1 text-sm font-semibold">{c.name}</span><Badge tone={tierTone[c.tier]}>{c.tier}</Badge></button></li>)}</ul>}
                <Field label="یا فروش به مهمان (بدون ثبت در باشگاه)"><input value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="نام مهمان (اختیاری)" className={fieldCls} /></Field>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="اقلام فاکتور" />
          <div className="space-y-4 px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              <select aria-label="خدمت" value={svcPick} onChange={(e) => setSvcPick(e.target.value)} className={`${fieldCls} !w-auto min-w-40 flex-1`}>{db.services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} · {short(s.price)}</option>)}</select>
              <Button variant="soft" onClick={addService}><Plus size={14} />خدمت</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="محصول" value={prodPick} onChange={(e) => setProdPick(e.target.value)} className={`${fieldCls} !w-auto min-w-40 flex-1`}>{db.inv.filter((x) => x.kind === "retail").map((p) => <option key={p.id} value={p.id}>{p.name} · {short(p.price)} ({fa(p.stock)} موجود)</option>)}</select>
              <Button variant="soft" onClick={addProduct}><Plus size={14} />محصول</Button>
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {lines.map((l, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-40"><b className="block">{l.name}</b><span className="text-xs text-ink3">{toman(l.price)}{l.kind === "service" ? " · خدمت" : " · محصول"}</span></span>
                  {l.kind === "service" && <select aria-label={`متخصص ${l.name}`} value={l.staffId} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, staffId: e.target.value } : x)))} className={`${fieldCls} !w-auto !py-1.5`}>{db.staff.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
                  <span className="flex items-center gap-1.5"><button aria-label="کم" onClick={() => setQty(i, -1)} className="cursor-pointer rounded-md border border-line p-1"><Minus size={12} /></button><b className="w-4 text-center">{fa(l.qty)}</b><button aria-label="زیاد" onClick={() => setQty(i, 1)} className="cursor-pointer rounded-md border border-line p-1"><Plus size={12} /></button></span>
                  <b className="w-24 text-left">{short(l.price * l.qty)}</b>
                  <button aria-label="حذف ردیف" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="cursor-pointer rounded-lg p-1.5 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
                </li>
              ))}
              {!lines.length && <li className="px-4 py-6 text-center text-sm text-ink3">هنوز اقلامی اضافه نشده است.</li>}
            </ul>
          </div>
        </Card>
      </div>

      <Card className="xl:sticky xl:top-20">
        <CardHead title="تخفیف و پرداخت" />
        <div className="space-y-4 px-5 pb-5 text-sm">
          <div>
            <label className="flex items-center justify-between">تخفیف (٪)<input aria-label="درصد تخفیف" type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Math.min(100, Math.max(0, +e.target.value || 0)))} className="w-16 rounded-lg border border-line px-2 py-1 text-center" /></label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tierPct > 0 && <button onClick={() => setDiscount(tierPct)} className="cursor-pointer rounded-full bg-rosesoft px-2.5 py-1 text-[11px] font-bold text-rosedeep">سطح {cust?.tier}: {fa(tierPct)}٪</button>}
              {friendPct > 0 && <button onClick={() => setDiscount(friendPct)} className="cursor-pointer rounded-full bg-goldsoft px-2.5 py-1 text-[11px] font-bold text-gold"><Gift size={11} className="ml-1 inline" />معرفی‌شده: {fa(friendPct)}٪</button>}
              {discount > 0 && <button onClick={() => setDiscount(0)} className="cursor-pointer rounded-full bg-surface2 px-2.5 py-1 text-[11px] font-semibold text-ink2">حذف تخفیف</button>}
            </div>
          </div>
          <dl className="space-y-1.5 border-y border-line py-3">
            <div className="flex justify-between text-ink2"><dt>جمع اقلام</dt><dd>{toman(subtotal)}</dd></div>
            {off > 0 && <div className="flex justify-between text-danger"><dt>تخفیف</dt><dd>− {toman(off)}</dd></div>}
            <div className="flex justify-between text-base font-extrabold"><dt>قابل پرداخت</dt><dd className="text-rosedeep">{toman(total)}</dd></div>
          </dl>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink2">پرداخت (می‌تواند ترکیبی باشد)</p>
            <div className="flex flex-wrap gap-1.5">{(["نقدی", "کارت", "آنلاین"] as PayMethod[]).map((m) => <button key={m} disabled={!total} onClick={() => quick(m)} className="cursor-pointer rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-ink2 hover:bg-surface2 disabled:opacity-40">کل مبلغ {m}</button>)}</div>
            {pays.map((p, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-2 rounded-xl border border-line p-2">
                <select aria-label="روش پرداخت" value={p.method} onChange={(e) => setPays(pays.map((x, j) => (j === i ? { ...x, method: e.target.value as PayMethod } : x)))} className={`${fieldCls} !w-auto !py-1.5`}>{methods.map((m) => <option key={m}>{m}</option>)}</select>
                <input aria-label="مبلغ پرداخت" type="number" min={0} value={p.amount} onChange={(e) => setPays(pays.map((x, j) => (j === i ? { ...x, amount: +e.target.value || 0 } : x)))} className={`${fieldCls} !py-1.5`} />
                <button aria-label="حذف پرداخت" onClick={() => setPays(pays.filter((_, j) => j !== i))} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={14} /></button>
                {p.method === "کارت هدیه" && <input aria-label="کد کارت هدیه" placeholder="GC-0000-0000" dir="ltr" value={p.ref ?? ""} onChange={(e) => setPays(pays.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)))} className={`${fieldCls} col-span-3 !py-1.5`} />}
                {p.method === "کیف پول" && <p className="col-span-3 text-[11px] text-ink3">موجودی کیف پول مشتری: {toman(cust?.wallet ?? 0)}</p>}
              </div>
            ))}
            <Button variant="ghost" disabled={left <= 0} onClick={() => setPays([...pays, { method: "نقدی", amount: left }])}><Plus size={14} />افزودن روش پرداخت</Button>
          </div>

          <div className={clsx("rounded-xl p-3 text-xs leading-6", left > 0 ? "bg-ambersoft text-amber" : left < 0 ? "bg-dangersoft text-danger" : "bg-sagesoft text-sage")}>
            {left > 0 ? <>مانده‌ی پرداخت‌نشده: <b>{toman(left)}</b>{cust ? " — به‌عنوان بدهی مشتری ثبت می‌شود." : " — برای ثبت بدهی مشتری لازم است."}</> : left < 0 ? "پرداخت بیشتر از مبلغ فاکتور است." : total > 0 ? "پرداخت کامل است ✓" : "—"}
          </div>
          {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
          <Button className="w-full !py-3" disabled={closed || !lines.length} onClick={submit}>ثبت فاکتور</Button>
        </div>
      </Card>
    </div>
  );
}
