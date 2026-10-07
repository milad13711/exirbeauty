"use client";
import { useEffect, useMemo, useState } from "react";
import { Ban, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "./ui";
import { crm, type Appt, type CustomerRow, type DebtRow, type PayMethod, type Product, type RealMethod, type SaleLineIn, type SaleView, type Service, type Staff } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, shortToman, todayLocal, toman } from "@/lib/fmt";
import { totals } from "@/server/modules/cashier/money"; // pure arithmetic, shared so the preview rounds exactly like the server
import { useQuery } from "@/lib/useQuery";

const METHOD: Record<PayMethod, string> = { CASH: "نقدی", CARD: "کارت", ONLINE: "آنلاین", WALLET: "کیف پول" };
const REAL: RealMethod[] = ["CASH", "CARD", "ONLINE"];
const STATUS: Record<SaleView["status"], { label: string; tone: Tone }> = { PAID: { label: "پرداخت‌شده", tone: "sage" }, DEBT: { label: "بدهکار", tone: "amber" }, VOID: { label: "باطل", tone: "danger" } };
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));

// ───────── new invoice ─────────
type Row = SaleLineIn & { key: number };
let seq = 0;

function NewSale({ services, staff, fromAppt, onClose, onDone }: { services: Service[]; staff: Staff[]; fromAppt: Appt | null; onClose: () => void; onDone: (s: SaleView) => void }) {
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(fromAppt ? { id: fromAppt.customerId, name: fromAppt.customerName ?? "" } : null);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>(fromAppt ? [{ key: ++seq, kind: "SERVICE", refId: fromAppt.serviceId, name: fromAppt.serviceName, qty: 1, price: fromAppt.price, staffId: fromAppt.staffId }] : []);
  const [discount, setDiscount] = useState("0");
  const [pays, setPays] = useState<{ key: number; method: PayMethod; amount: string }[]>([]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const found = useQuery(() => (q.trim().length >= 2 && !customer ? crm.customers({ q: q.trim(), limit: 6 }) : Promise.resolve(null)), [q, customer]);

  // Club wallet (loyalty module): only offered when the chosen customer has a balance; a salon without the module just gets no option.
  const club = useQuery(() => (customer ? crm.loyaltyCustomer(customer.id).catch(() => null) : Promise.resolve(null)), [customer?.id]);
  const walletBal = club.data?.wallet ?? 0;
  const methods: PayMethod[] = walletBal > 0 ? [...REAL, "WALLET"] : REAL;

  // Retail products from the inventory module (a salon without it just gets no picker).
  const stock = useQuery(() => crm.products({ kind: "RETAIL" }).catch(() => [] as Product[]), []);
  const addProduct = (id: string) => {
    const p = stock.data?.find((x) => x.id === id);
    if (p) setRows((l) => [...l, { key: ++seq, kind: "PRODUCT", refId: p.id, name: p.name, qty: 1, price: p.price }]);
  };

  const pct = Math.min(100, num(discount));
  const t = useMemo(() => totals(rows, pct), [rows, pct]);
  const paid = pays.reduce((a, p) => a + num(p.amount), 0);
  const debt = t.total - paid;

  const patch = (key: number, p: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addService = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) setRows((l) => [...l, { key: ++seq, kind: "SERVICE", refId: s.id, name: s.name, qty: 1, price: s.price, staffId: s.staffIds[0] ?? null }]);
  };

  async function save() {
    setErr("");
    if (!rows.length) return setErr("حداقل یک ردیف به فاکتور اضافه کنید.");
    if (rows.some((r) => !r.name.trim())) return setErr("نام همه‌ی ردیف‌ها را وارد کنید.");
    if (paid > t.total) return setErr("مبلغ دریافتی از جمع فاکتور بیشتر است.");
    if (debt > 0 && !customer) return setErr("برای ثبت بدهی باید مشتری انتخاب شود.");
    setBusy(true);
    try {
      const s = await crm.createSale({
        customerId: customer?.id ?? null, apptId: fromAppt?.id ?? null, discountPct: pct, note: note.trim(),
        lines: rows.map(({ key: _k, ...r }) => { void _k; return { ...r, name: r.name.trim() }; }),
        payments: pays.map((p) => ({ method: p.method, amount: num(p.amount) })).filter((p) => p.amount > 0),
      });
      onDone(s); onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }

  return (
    <Modal title={fromAppt ? `فاکتور نوبت ${fromAppt.customerName}` : "فاکتور جدید"} onClose={onClose} wide>
      <div className="space-y-4">
        <Field label="مشتری (اختیاری برای پرداخت کامل)">
          {customer ? (
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm"><b>{customer.name}</b>{!fromAppt && <button onClick={() => setCustomer(null)} className="cursor-pointer text-xs font-bold text-rose">تغییر</button>}</div>
          ) : (
            <div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره‌ی مشتری…" className={fieldCls} />
              {found.data && <ul className="mt-1.5 divide-y divide-line rounded-xl border border-line">{found.data.items.map((c: CustomerRow) => <li key={c.id}><button onClick={() => setCustomer({ id: c.id, name: c.name })} className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-right text-sm hover:bg-surface2"><b>{c.name}</b><bdi dir="ltr" className="text-xs text-ink3">{c.phone}</bdi></button></li>)}</ul>}
            </div>
          )}
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">ردیف‌ها</p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[1fr_64px_110px_auto] items-center gap-2 rounded-xl border border-line p-2">
                <div className="min-w-0">
                  <input aria-label="نام" value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} className={`${fieldCls} !min-h-9 !py-1.5`} />
                  {r.kind === "SERVICE" && <select aria-label="متخصص" value={r.staffId ?? ""} onChange={(e) => patch(r.key, { staffId: e.target.value || null })} className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 text-xs"><option value="">بدون متخصص</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
                </div>
                <input aria-label="تعداد" value={r.qty} onChange={(e) => patch(r.key, { qty: Math.max(1, num(e.target.value)) })} inputMode="numeric" dir="ltr" className={`${fieldCls} !min-h-9 !px-2 !py-1.5 text-center`} />
                <input aria-label="قیمت" value={r.price} onChange={(e) => patch(r.key, { price: num(e.target.value) })} inputMode="numeric" dir="ltr" className={`${fieldCls} !min-h-9 !px-2 !py-1.5 text-center`} />
                <button aria-label="حذف ردیف" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="grid size-8 cursor-pointer place-items-center rounded-lg text-ink3 hover:bg-dangersoft hover:text-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="افزودن خدمت" value="" onChange={(e) => e.target.value && addService(e.target.value)} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-sm"><option value="">+ افزودن خدمت…</option>{services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} — {shortToman(s.price)}</option>)}</select>
            {!!stock.data?.length && <select aria-label="افزودن محصول" value="" onChange={(e) => e.target.value && addProduct(e.target.value)} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-sm"><option value="">+ محصول انبار…</option>{stock.data.map((p) => <option key={p.id} value={p.id}>{p.name} — {shortToman(p.price)} ({faNum(p.stock)} عدد)</option>)}</select>}
            <Button variant="ghost" className="!min-h-9" onClick={() => setRows((l) => [...l, { key: ++seq, kind: "PRODUCT", name: "", qty: 1, price: 0 }])}><Plus size={14} />محصول / سایر</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="تخفیف (٪)">
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} />
            {club.data && club.data.off > 0 && pct !== club.data.off && <button type="button" onClick={() => setDiscount(String(club.data!.off))} className="mt-1 cursor-pointer text-xs font-bold text-rose">اعمال تخفیف سطح {club.data.tier} ({faNum(club.data.off)}٪)</button>}
          </Field>
          <Field label="یادداشت"><input value={note} onChange={(e) => setNote(e.target.value)} className={fieldCls} /></Field>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-ink2">پرداخت</p>
          <div className="space-y-2">
            {pays.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <select aria-label="روش" value={p.method} onChange={(e) => setPays((l) => l.map((x) => (x.key === p.key ? { ...x, method: e.target.value as PayMethod } : x)))} className="rounded-xl border border-line bg-surface px-2.5 py-2 text-sm">{methods.map((m) => <option key={m} value={m}>{m === "WALLET" ? `${METHOD[m]} (${toman(walletBal)})` : METHOD[m]}</option>)}</select>
                <input aria-label="مبلغ" value={p.amount} onChange={(e) => setPays((l) => l.map((x) => (x.key === p.key ? { ...x, amount: e.target.value } : x)))} inputMode="numeric" dir="ltr" placeholder="مبلغ (تومان)" className={`${fieldCls} !min-h-10`} />
                <button aria-label="حذف پرداخت" onClick={() => setPays((l) => l.filter((x) => x.key !== p.key))} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-ink3 hover:text-danger"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="ghost" className="!min-h-9" onClick={() => setPays((l) => [...l, { key: ++seq, method: "CASH", amount: String(Math.max(0, t.total - paid)) }])}><Plus size={14} />افزودن پرداخت</Button>
          </div>
        </div>

        <dl className="space-y-1.5 rounded-xl bg-surface2 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink3">جمع ردیف‌ها</dt><dd>{toman(t.subtotal)}</dd></div>
          {t.discount > 0 && <div className="flex justify-between"><dt className="text-ink3">تخفیف</dt><dd>− {toman(t.discount)}</dd></div>}
          <div className="flex justify-between text-base font-extrabold"><dt>مبلغ قابل پرداخت</dt><dd>{toman(t.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink3">دریافتی</dt><dd>{toman(paid)}</dd></div>
          <div className={`flex justify-between font-bold ${debt > 0 ? "text-amber" : debt < 0 ? "text-danger" : "text-sage"}`}><dt>{debt < 0 ? "اضافه‌پرداخت" : "مانده (بدهی)"}</dt><dd>{toman(Math.abs(debt))}</dd></div>
        </dl>
        {err && <ErrorNote message={err} />}
        <div className="flex gap-2"><Button onClick={save} disabled={busy}>{busy ? "در حال ثبت…" : "ثبت فاکتور"}</Button><Button variant="ghost" onClick={onClose}>انصراف</Button></div>
      </div>
    </Modal>
  );
}

// ───────── sale detail ─────────
function SaleModal({ sale, canVoid, onClose, onChanged }: { sale: SaleView; canVoid: boolean; onClose: () => void; onChanged: () => void }) {
  const [reason, setReason] = useState(""); const [err, setErr] = useState(""); const [asking, setAsking] = useState(false);
  async function doVoid() { setErr(""); try { await crm.voidSale(sale.id, reason.trim()); onChanged(); onClose(); } catch (e) { setErr(errorText(e)); } }
  return (
    <Modal title={`فاکتور ${sale.code}`} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p className="flex items-center justify-between"><span className="text-ink2">{faDate.short(sale.date)} · {sale.customerName || "مشتری ناشناس"}</span><Badge tone={STATUS[sale.status].tone}>{STATUS[sale.status].label}</Badge></p>
        <ul className="divide-y divide-line rounded-xl border border-line">{sale.lines.map((l) => <li key={l.id} className="flex justify-between gap-3 px-3 py-2"><span>{l.name}{l.qty > 1 && <span className="text-ink3"> × {faNum(l.qty)}</span>}</span><b>{toman(l.price * l.qty)}</b></li>)}</ul>
        <dl className="space-y-1">
          {sale.discount > 0 && <div className="flex justify-between"><dt className="text-ink3">تخفیف ({faNum(sale.discountPct)}٪)</dt><dd>− {toman(sale.discount)}</dd></div>}
          <div className="flex justify-between font-extrabold"><dt>جمع</dt><dd>{toman(sale.total)}</dd></div>
          {sale.payments.map((p, i) => <div key={i} className="flex justify-between text-xs text-ink2"><dt>{METHOD[p.method]}</dt><dd>{toman(p.amount)}</dd></div>)}
          {sale.debt > 0 && <div className="flex justify-between font-bold text-amber"><dt>مانده</dt><dd>{toman(sale.debt)}</dd></div>}
        </dl>
        {sale.note && <p className="rounded-xl bg-surface2 p-2.5 text-xs text-ink2">{sale.note}</p>}
        {sale.status === "VOID" && <p className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">دلیل ابطال: {sale.voidReason}</p>}
        {canVoid && sale.status !== "VOID" && (asking ? (
          <div className="space-y-2"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل ابطال (الزامی)" className={fieldCls} autoFocus /><div className="flex gap-2"><Button className="!bg-none !bg-danger" disabled={reason.trim().length < 3} onClick={doVoid}>ابطال فاکتور</Button><Button variant="ghost" onClick={() => setAsking(false)}>انصراف</Button></div></div>
        ) : <Button variant="ghost" className="!text-danger" onClick={() => setAsking(true)}><Ban size={14} />ابطال فاکتور</Button>)}
        {err && <ErrorNote message={err} />}
      </div>
    </Modal>
  );
}

// ───────── tabs ─────────
function SalesTab({ owner, services, staff, preAppt }: { owner: boolean; services: Service[]; staff: Staff[]; preAppt: string | null }) {
  const [date, setDate] = useState(todayLocal());
  const sales = useQuery(() => crm.sales({ date }), [date]);
  const ready = useQuery(() => crm.appointments({ date: todayLocal() }), []);
  const [modal, setModal] = useState<{ kind: "new"; appt: Appt | null } | { kind: "view"; sale: SaleView } | null>(null);
  const [last, setLast] = useState<SaleView | null>(null);
  const list = sales.data ?? [];
  const live = list.filter((s) => s.status !== "VOID");
  const invoiced = new Set(list.filter((s) => s.status !== "VOID" && s.apptId).map((s) => s.apptId));
  const waiting = (ready.data ?? []).filter((a) => (a.status === "CONFIRMED" || a.status === "IN_SERVICE" || a.status === "DONE") && !invoiced.has(a.id));

  useEffect(() => {
    if (!preAppt) return;
    crm.appointment(preAppt).then((a) => setModal({ kind: "new", appt: a })).catch(() => {});
  }, [preAppt]);

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="فاکتورهای این روز" value={faNum(live.length)} icon={<Receipt size={16} />} tone="rose" />
        <Stat label="فروش" value={shortToman(live.reduce((a, s) => a + s.total, 0))} tone="sage" />
        <Stat label="مانده‌ی بدهکاری" value={shortToman(live.reduce((a, s) => a + s.debt, 0))} tone="amber" />
      </div>
      {last && <p role="status" className="mb-3 rounded-xl bg-sagesoft p-3 text-sm text-sage">فاکتور {last.code} به مبلغ {toman(last.total)} ثبت شد.</p>}
      {date === todayLocal() && waiting.length > 0 && (
        <Card className="mb-4 p-4">
          <p className="mb-2 text-xs font-bold text-ink2">نوبت‌های امروز بدون فاکتور</p>
          <div className="flex flex-wrap gap-2">{waiting.map((a) => <Chip key={a.id} active={false} onClick={() => setModal({ kind: "new", appt: a })}>{a.customerName} · {a.serviceName}</Chip>)}</div>
        </Card>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
          <input type="date" aria-label="روز" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-xl border border-line bg-surface px-2 py-1.5 text-xs" />
          <b className="text-sm">{faDate.full(date)}</b>
          <Button className="mr-auto !min-h-9" onClick={() => setModal({ kind: "new", appt: null })}><Plus size={14} />فاکتور جدید</Button>
        </div>
        {sales.error && <div className="px-5 pb-3"><ErrorNote message={errorText(sales.error)} onRetry={sales.reload} /></div>}
        {sales.loading && !sales.data ? <Spinner /> : list.length === 0 ? <p className="px-5 pb-6 text-sm text-ink3">فاکتوری برای این روز ثبت نشده است.</p> : (
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <li key={s.id}><button onClick={() => setModal({ kind: "view", sale: s })} className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right hover:bg-surface2/50">
                <span className="w-16 shrink-0 text-xs font-bold text-ink3">{s.code}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{s.customerName || "مشتری ناشناس"}</b><span className="text-xs text-ink3">{s.lines.map((l) => l.name).join("، ")}</span></span>
                <b className={`text-sm ${s.status === "VOID" ? "line-through opacity-50" : ""}`}>{toman(s.total)}</b>
                <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
              </button></li>
            ))}
          </ul>
        )}
      </Card>
      {modal?.kind === "new" && <NewSale services={services} staff={staff} fromAppt={modal.appt} onClose={() => setModal(null)} onDone={(s) => { setLast(s); void sales.reload(); void ready.reload(); }} />}
      {modal?.kind === "view" && <SaleModal sale={modal.sale} canVoid={owner} onClose={() => setModal(null)} onChanged={() => { void sales.reload(); }} />}
    </>
  );
}

function DebtsTab() {
  const q = useQuery(() => crm.debts(), []);
  const [pay, setPay] = useState<DebtRow | null>(null);
  const [amount, setAmount] = useState(""); const [method, setMethod] = useState<RealMethod>("CASH");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const rows = q.data ?? [];
  async function go() {
    if (!pay) return; setBusy(true); setErr("");
    try { await crm.payDebt({ customerId: pay.customerId, amount: num(amount), method }); setPay(null); await q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <>
      <Card>
        <CardHead title="بدهکاران" hint={rows.length ? `${faNum(rows.length)} مشتری · ${toman(rows.reduce((a, r) => a + r.debt, 0))}` : undefined} />
        {q.error && <div className="px-5 pb-3"><ErrorNote message={errorText(q.error)} onRetry={q.reload} /></div>}
        {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <p className="px-5 pb-6 text-sm text-ink3">هیچ مشتری‌ای بدهکار نیست.</p> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => <li key={r.customerId} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b>{r.name}</b> <bdi dir="ltr" className="text-xs text-ink3">{r.phone}</bdi><span className="block text-xs text-ink3">{faNum(r.invoices)} فاکتور{r.since && ` · از ${faDate.short(r.since)}`}</span></span><b className="text-amber">{toman(r.debt)}</b><Button variant="soft" className="!min-h-9" onClick={() => { setPay(r); setAmount(String(r.debt)); setMethod("CASH"); setErr(""); }}>دریافت</Button></li>)}
          </ul>
        )}
      </Card>
      {pay && (
        <Modal title={`دریافت بدهی ${pay.name}`} onClose={() => setPay(null)}>
          <div className="space-y-3">
            <p className="text-sm text-ink2">کل بدهی: <b>{toman(pay.debt)}</b> — قدیمی‌ترین فاکتورها اول تسویه می‌شوند.</p>
            <Field label="مبلغ (تومان)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
            <div className="flex gap-1.5">{REAL.map((m) => <Chip key={m} active={method === m} onClick={() => setMethod(m)}>{METHOD[m]}</Chip>)}</div>
            {err && <ErrorNote message={err} />}
            <div className="flex gap-2"><Button onClick={go} disabled={busy || num(amount) < 1}>ثبت دریافت</Button><Button variant="ghost" onClick={() => setPay(null)}>انصراف</Button></div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ExpensesTab() {
  const [from, setFrom] = useState(todayLocal());
  const q = useQuery(() => crm.expenses(from), [from]);
  const [title, setTitle] = useState(""); const [amount, setAmount] = useState(""); const [method, setMethod] = useState<"CASH" | "CARD">("CASH"); const [category, setCategory] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const rows = q.data ?? [];
  async function add() {
    setBusy(true); setErr("");
    try { await crm.addExpense({ title: title.trim(), amount: num(amount), method, category: category.trim() }); setTitle(""); setAmount(""); setCategory(""); setFrom(todayLocal()); await q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3"><b className="text-sm">هزینه‌ها</b><input type="date" aria-label="روز" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="mr-auto rounded-xl border border-line bg-surface px-2 py-1.5 text-xs" /></div>
        {q.error && <div className="px-5 pb-3"><ErrorNote message={errorText(q.error)} onRetry={q.reload} /></div>}
        {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <p className="px-5 pb-6 text-sm text-ink3">هزینه‌ای ثبت نشده است.</p> : (
          <ul className="divide-y divide-line">{rows.map((e) => <li key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm"><span className="min-w-0 flex-1"><b>{e.title}</b><span className="block text-xs text-ink3">{e.category && `${e.category} · `}{METHOD[e.method]}</span></span><b>{toman(e.amount)}</b><button aria-label="حذف" onClick={async () => { if (confirm("این هزینه حذف شود؟")) { try { await crm.deleteExpense(e.id); await q.reload(); } catch (x) { setErr(errorText(x)); } } }} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button></li>)}</ul>
        )}
      </Card>
      <Card className="h-fit p-5">
        <h3 className="mb-3 text-sm font-bold">ثبت هزینه‌ی امروز</h3>
        <div className="space-y-3">
          <Field label="عنوان"><input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldCls} /></Field>
          <Field label="مبلغ (تومان)"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
          <Field label="دسته (اختیاری)"><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="اجاره، مواد، قبض…" className={fieldCls} /></Field>
          <div className="flex gap-1.5">{(["CASH", "CARD"] as const).map((m) => <Chip key={m} active={method === m} onClick={() => setMethod(m)}>{METHOD[m]}</Chip>)}</div>
          {err && <ErrorNote message={err} />}
          <Button className="w-full" disabled={busy || title.trim().length < 2 || num(amount) < 1} onClick={add}>ثبت هزینه</Button>
        </div>
      </Card>
    </div>
  );
}

function ReportTab() {
  const [date, setDate] = useState(todayLocal());
  const day = useQuery(() => crm.day(date), [date]);
  const [counted, setCounted] = useState(""); const [note, setNote] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const d = day.data;
  async function act(fn: () => Promise<unknown>) { setBusy(true); setErr(""); try { await fn(); await day.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  const s = d?.summary;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><input type="date" aria-label="روز" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="rounded-xl border border-line bg-surface px-2 py-1.5 text-xs" /><b className="text-sm">{faDate.full(date)}</b>{d?.closed && <Badge tone="neutral">روز بسته شده</Badge>}</div>
      {day.error && <ErrorNote message={errorText(day.error)} onRetry={day.reload} />}
      {day.loading && !d ? <Spinner /> : s && d && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="فروش" value={shortToman(s.revenue)} sub={`${faNum(s.count)} فاکتور`} tone="sage" />
            <Stat label="هزینه‌ها" value={shortToman(s.expenses)} tone="danger" />
            <Stat label="سود خالص" value={shortToman(s.net)} tone="rose" />
            <Stat label="بدهی جدید / وصول‌شده" value={`${shortToman(s.newDebt)} / ${shortToman(s.debtCollected)}`} tone="amber" />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHead title="تفکیک دریافت‌ها" />
              <dl className="space-y-2 px-5 pb-5 text-sm">
                {([["نقدی", s.cash], ["کارت", s.card], ["آنلاین", s.online], ...(s.wallet ? [["کیف پول", s.wallet] as const] : [])] as const).map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-ink3">{l}</dt><dd className="font-semibold">{toman(v)}</dd></div>)}
                <div className="flex justify-between border-t border-line pt-2"><dt className="text-ink3">خدمات / محصولات</dt><dd>{shortToman(s.services)} / {shortToman(s.products)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink3">تخفیف‌ها</dt><dd>{toman(s.discounts)}</dd></div>
              </dl>
            </Card>
            <Card>
              <CardHead title="سهم متخصص‌ها" />
              {s.byStaff.length === 0 ? <p className="px-5 pb-5 text-sm text-ink3">خدمتی ثبت نشده.</p> : (
                <ul className="divide-y divide-line">{s.byStaff.map((x) => <li key={x.staffId} className="flex justify-between px-5 py-2.5 text-sm"><span>{x.name}<span className="block text-xs text-ink3">فروش {toman(x.revenue)}</span></span><b>{toman(x.commission)}</b></li>)}</ul>
              )}
            </Card>
          </div>
          <Card className="p-5">
            <h3 className="mb-1 text-sm font-bold">بستن صندوق</h3>
            <p className="mb-3 text-xs text-ink3">نقد مورد انتظار = فروش نقدی + بدهی نقدی وصول‌شده − هزینه‌ی نقدی: <b className="text-ink">{toman(d.expectedCash)}</b></p>
            {d.closed && d.closing ? (
              <div className="space-y-2 text-sm">
                <p>شمارش‌شده: <b>{toman(d.closing.countedCash)}</b> · اختلاف: <b className={d.closing.difference === 0 ? "text-sage" : "text-danger"}>{d.closing.difference === 0 ? "ندارد" : `${d.closing.difference > 0 ? "+" : "−"} ${toman(Math.abs(d.closing.difference))}`}</b>{d.closing.note && <span className="text-ink3"> · {d.closing.note}</span>}</p>
                <p className="text-xs text-ink3">با بسته بودن روز، فاکتور، ابطال، هزینه و دریافت بدهیِ این روز قفل است.</p>
                <Button variant="ghost" disabled={busy} onClick={() => act(() => crm.reopenDay(date))}>بازکردن دوباره‌ی روز</Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="نقد شمارش‌شده (تومان)"><input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="numeric" dir="ltr" style={{ textAlign: "right" }} className={`${fieldCls} !w-44`} /></Field>
                <Field label="یادداشت"><input value={note} onChange={(e) => setNote(e.target.value)} className={`${fieldCls} !w-56`} /></Field>
                <Button disabled={busy || counted.trim() === ""} onClick={() => act(() => crm.closeDay(date, num(counted), note.trim()))}>بستن روز</Button>
              </div>
            )}
            {err && <div className="mt-3"><ErrorNote message={err} /></div>}
          </Card>
        </>
      )}
    </div>
  );
}

function Page({ preAppt }: { preAppt: string | null }) {
  const me = useMe();
  const owner = canManage(me);
  const [tab, setTab] = useState<"sales" | "debts" | "expenses" | "report">("sales");
  const services = useQuery(() => crm.services(), []);
  const staff = useQuery(() => crm.staff(), []);
  const tabs = [["sales", "فاکتورها"], ["debts", "بدهی‌ها"], ...(owner ? [["expenses", "هزینه‌ها"], ["report", "گزارش و بستن روز"]] : [])] as [typeof tab, string][];
  return (
    <>
      <PageTitle title="صندوق و درآمد" sub="فاکتور، پرداخت ترکیبی، بدهی، هزینه و بستن روز" />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">{tabs.map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{l}</Chip>)}</div>
      {tab === "sales" && (services.data && staff.data ? <SalesTab owner={owner} services={services.data} staff={staff.data} preAppt={preAppt} /> : <Spinner />)}
      {tab === "debts" && <DebtsTab />}
      {tab === "expenses" && owner && <ExpensesTab />}
      {tab === "report" && owner && <ReportTab />}
    </>
  );
}

export function LiveCashier({ apptId }: { apptId: string | null }) {
  return <LiveGate><Page preAppt={apptId} /></LiveGate>;
}
