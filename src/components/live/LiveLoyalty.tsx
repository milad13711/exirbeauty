"use client";
import { useState } from "react";
import { Crown, Gift, Plus, Trash2, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls, tierTone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Modal, Spinner } from "./ui";
import { crm, type LoyaltyConfig, type LoyaltyMember, type LoyaltyState } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const KIND: Record<string, string> = { EARN: "امتیاز فاکتور", EARN_REVERSE: "ابطال فاکتور", REDEEM: "استفاده از جایزه", ADJUST: "اصلاح دستی امتیاز", CASHBACK: "بازگشت وجه", CASHBACK_REVERSE: "ابطال بازگشت وجه", REWARD_CREDIT: "اعتبار جایزه", WALLET_SPEND: "پرداخت از کیف پول", WALLET_REFUND: "بازگشت به کیف پول", WALLET_ADJUST: "اصلاح دستی کیف پول" };
const num = (s: string) => Math.max(0, Math.round(Number(s.replace(/[^\d.]/g, "")) || 0));
const REWARD_KIND = { wallet: "اعتبار کیف پول", free: "خدمت رایگان", product: "محصول" } as const;

// ───────── one member ─────────
function MemberModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const me = useMe();
  const st = useQuery(() => crm.loyaltyCustomer(id), [id]);
  const cfg = useQuery(crm.loyaltyConfig, []);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [pts, setPts] = useState(""); const [wal, setWal] = useState(""); const [note, setNote] = useState("");
  const s: LoyaltyState | null = st.data;
  async function run(fn: () => Promise<unknown>) {
    setErr(""); setBusy(true);
    try { await fn(); await st.reload(); onChanged(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const signed = (v: string) => { const n = Number(v.replace(/[^\d-]/g, "")); return Number.isFinite(n) ? Math.round(n) : 0; };
  return (
    <Modal title={s ? s.name : "عضو باشگاه"} onClose={onClose} wide>
      {!s ? <Spinner /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface2 p-3"><p className="text-xs text-ink3">سطح</p><Badge tone={tierTone[s.tier] ?? "neutral"}>{s.tier}</Badge></div>
            <div className="rounded-xl bg-surface2 p-3"><p className="text-xs text-ink3">امتیاز</p><p className="font-extrabold">{faNum(s.points)}</p></div>
            <div className="rounded-xl bg-surface2 p-3"><p className="text-xs text-ink3">کیف پول</p><p className="font-extrabold">{toman(s.wallet)}</p></div>
          </div>
          <p className="text-xs text-ink3">{s.next.left > 0 ? `${faNum(s.next.left)} امتیاز تا ${s.next.label}` : s.next.label} · مجموع امتیاز کسب‌شده: {faNum(s.lifetime)}</p>
          {err && <ErrorNote message={err} />}
          {cfg.data?.rewards.length ? (
            <section>
              <h3 className="mb-2 text-sm font-bold">جایزه‌ها</h3>
              <ul className="space-y-2">
                {cfg.data.rewards.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm">
                    <Gift size={16} className="text-rose" /><span className="min-w-0 flex-1"><b>{r.name}</b><span className="block text-xs text-ink3">{faNum(r.cost)} امتیاز · {REWARD_KIND[r.kind]}</span></span>
                    <Button variant="soft" disabled={busy || s.points < r.cost} onClick={() => confirm(`«${r.name}» برای ${s.name} ثبت شود؟`) && run(() => crm.loyaltyRedeem(id, r.id))}>دریافت</Button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-ink3">جایزه‌ی اعتباری بلافاصله به کیف پول اضافه می‌شود؛ خدمت یا محصول رایگان را هنگام فاکتور بدهید.</p>
            </section>
          ) : null}
          {canManage(me) && (
            <section className="rounded-xl border border-line p-3">
              <h3 className="mb-2 text-sm font-bold">اصلاح دستی (منفی = کسر)</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field label="امتیاز"><input dir="ltr" className={fieldCls} value={pts} onChange={(e) => setPts(e.target.value)} placeholder="0" inputMode="numeric" /></Field>
                <Field label="کیف پول (تومان)"><input dir="ltr" className={fieldCls} value={wal} onChange={(e) => setWal(e.target.value)} placeholder="0" inputMode="numeric" /></Field>
                <Field label="دلیل"><input className={fieldCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
              </div>
              <Button className="mt-2" disabled={busy || (!signed(pts) && !signed(wal)) || note.trim().length < 2} onClick={() => run(async () => { await crm.loyaltyAdjust(id, { points: signed(pts), wallet: signed(wal), note: note.trim() }); setPts(""); setWal(""); setNote(""); })}>ثبت اصلاح</Button>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-sm font-bold">گردش اخیر</h3>
            {s.log.length ? (
              <ul className="divide-y divide-line text-sm">
                {s.log.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-ink2">{KIND[l.kind] ?? l.kind}{l.note ? ` — ${l.note}` : ""}<span className="mr-2 text-xs text-ink3">{faDate.short(l.createdAt.slice(0, 10))}</span></span>
                    <span className="text-xs font-bold">{l.points ? `${l.points > 0 ? "+" : ""}${faNum(l.points)} امتیاز` : ""} {l.wallet ? `${l.wallet > 0 ? "+" : ""}${toman(l.wallet)}` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink3">هنوز تراکنشی نیست.</p>}
          </section>
        </div>
      )}
    </Modal>
  );
}

// ───────── members & overview ─────────
function Members() {
  const [sort, setSort] = useState<"points" | "wallet" | "lifetime">("points");
  const [open, setOpen] = useState<string | null>(null);
  const ov = useQuery(crm.loyaltyOverview, []);
  const list = useQuery(() => crm.loyaltyMembers(sort), [sort]);
  const me = useMe();
  const refresh = () => { void ov.reload(); void list.reload(); };
  const rows: LoyaltyMember[] = list.data ?? [];
  return (
    <div className="space-y-4">
      {canManage(me) && ov.data && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="اعضای باشگاه" value={faNum(ov.data.members)} icon={<Crown size={16} />} />
          <Stat label="امتیاز در گردش" value={faNum(ov.data.points)} />
          <Stat label="مجموع کیف پول مشتریان" value={toman(ov.data.walletTotal)} icon={<Wallet size={16} />} tone="amber" sub="بدهی سالن به مشتریان" />
        </div>
      )}
      <Card className="p-5">
        <CardHead title="اعضا" hint="هر مشتری با اولین فاکتور وارد باشگاه می‌شود" />
        <div className="mb-3 flex flex-wrap gap-2">
          {([["points", "بیشترین امتیاز"], ["lifetime", "وفادارترین"], ["wallet", "بیشترین اعتبار"]] as const).map(([v, l]) => <Chip key={v} active={sort === v} onClick={() => setSort(v)}>{l}</Chip>)}
        </div>
        {list.loading && !list.data ? <Spinner /> : !rows.length ? <p className="text-sm text-ink3">هنوز عضوی نیست؛ پس از اولین فاکتور مشتری‌دار اینجا می‌آید.</p> : (
          <ul className="divide-y divide-line">
            {rows.map((m) => (
              <li key={m.customerId}>
                <button onClick={() => setOpen(m.customerId)} className="flex w-full cursor-pointer items-center gap-3 py-3 text-right text-sm hover:bg-surface2">
                  <span className="min-w-0 flex-1 font-bold">{m.name}<span className="block text-xs font-normal text-ink3">{m.phone}</span></span>
                  <Badge tone={tierTone[m.tier] ?? "neutral"}>{m.tier}</Badge>
                  <span className="w-20 text-left text-xs">{faNum(m.points)} امتیاز</span>
                  <span className="w-28 text-left text-xs text-ink2">{toman(m.wallet)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {open && <MemberModal id={open} onClose={() => setOpen(null)} onChanged={refresh} />}
    </div>
  );
}

// ───────── settings ─────────
function Settings() {
  const me = useMe();
  const q = useQuery(crm.loyaltyConfig, []);
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  return <SettingsForm initial={q.data} canEdit={canManage(me)} />;
}
function SettingsForm({ initial, canEdit }: { initial: LoyaltyConfig; canEdit: boolean }) {
  const [c, setC] = useState<LoyaltyConfig>(structuredClone(initial));
  const [err, setErr] = useState(""); const [saved, setSaved] = useState(false); const [busy, setBusy] = useState(false);
  const touch = (n: LoyaltyConfig) => { setC(n); setSaved(false); };
  async function save() {
    setErr(""); setBusy(true);
    try { setC(await crm.loyaltyPutConfig(c)); setSaved(true); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const input = (v: number, on: (n: number) => void, w = "w-24") => <input dir="ltr" disabled={!canEdit} className={`${fieldCls} ${w} !min-h-10 text-center`} value={String(v)} onChange={(e) => on(num(e.target.value))} inputMode="numeric" />;
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <CardHead title="سطح‌ها" hint="سطح با مجموع امتیازِ کسب‌شده تعیین می‌شود و هیچ‌وقت پایین نمی‌آید" action={canEdit && c.tiers.length < 8 ? <Button variant="soft" onClick={() => touch({ ...c, tiers: [...c.tiers, { name: "", from: (c.tiers.at(-1)?.from ?? 0) + 500, off: 0, perks: "" }] })}><Plus size={14} />سطح</Button> : undefined} />
        <div className="space-y-2">
          {c.tiers.map((t, i) => (
            <div key={i} className="grid items-center gap-2 sm:grid-cols-[1fr_6rem_6rem_2fr_2rem]">
              <input disabled={!canEdit} placeholder="نام سطح" className={`${fieldCls} !min-h-10`} value={t.name} onChange={(e) => touch({ ...c, tiers: c.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              {input(t.from, (n) => touch({ ...c, tiers: c.tiers.map((x, j) => (j === i ? { ...x, from: n } : x)) }))}
              {input(t.off, (n) => touch({ ...c, tiers: c.tiers.map((x, j) => (j === i ? { ...x, off: Math.min(100, n) } : x)) }))}
              <input disabled={!canEdit} placeholder="مزایا" className={`${fieldCls} !min-h-10`} value={t.perks} onChange={(e) => touch({ ...c, tiers: c.tiers.map((x, j) => (j === i ? { ...x, perks: e.target.value } : x)) })} />
              {canEdit && c.tiers.length > 1 && <button aria-label="حذف سطح" onClick={() => touch({ ...c, tiers: c.tiers.filter((_, j) => j !== i) })} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button>}
            </div>
          ))}
          <p className="text-xs text-ink3">ستون‌ها: نام · از چند امتیاز · تخفیف ٪ · مزایا</p>
        </div>
      </Card>
      <Card className="p-5">
        <CardHead title="کسب امتیاز" hint="روی مبلغ فاکتور پس از تخفیف محاسبه می‌شود" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="هر مراجعه (امتیاز)">{input(c.earn.visit, (n) => touch({ ...c, earn: { ...c.earn, visit: n } }))}</Field>
          <Field label="خدمت: امتیاز به‌ازای هر مبلغ"><div className="flex items-center gap-2">{input(c.earn.svc.pts, (n) => touch({ ...c, earn: { ...c.earn, svc: { ...c.earn.svc, pts: n } } }), "w-20")}<span className="text-xs text-ink3">به‌ازای</span>{input(c.earn.svc.per, (n) => touch({ ...c, earn: { ...c.earn, svc: { ...c.earn.svc, per: n } } }), "w-32")}</div></Field>
          <Field label="محصول: امتیاز به‌ازای هر مبلغ"><div className="flex items-center gap-2">{input(c.earn.prod.pts, (n) => touch({ ...c, earn: { ...c.earn, prod: { ...c.earn.prod, pts: n } } }), "w-20")}<span className="text-xs text-ink3">به‌ازای</span>{input(c.earn.prod.per, (n) => touch({ ...c, earn: { ...c.earn, prod: { ...c.earn.prod, per: n } } }), "w-32")}</div></Field>
        </div>
      </Card>
      <Card className="p-5">
        <CardHead title="بازگشت وجه به کیف پول" action={<Toggle on={c.cashback.on} onChange={(v) => canEdit && touch({ ...c, cashback: { ...c.cashback, on: v } })} label="بازگشت وجه" />} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="درصد">{input(c.cashback.pct, (n) => touch({ ...c, cashback: { ...c.cashback, pct: Math.min(50, n) } }))}</Field>
          <Field label="حداقل مبلغ پرداخت (تومان)">{input(c.cashback.minSpend, (n) => touch({ ...c, cashback: { ...c.cashback, minSpend: n } }), "w-36")}</Field>
          <Field label="سقف هر فاکتور (تومان)">{input(c.cashback.maxPerSale, (n) => touch({ ...c, cashback: { ...c.cashback, maxPerSale: n } }), "w-36")}</Field>
        </div>
        <p className="mt-2 text-xs text-ink3">فقط روی مبلغی که غیر از کیف پول پرداخت شده محاسبه می‌شود.</p>
      </Card>
      <Card className="p-5">
        <CardHead title="جایزه‌ها" action={canEdit && c.rewards.length < 30 ? <Button variant="soft" onClick={() => touch({ ...c, rewards: [...c.rewards, { id: `r${Date.now().toString(36)}`, name: "", cost: 500, kind: "wallet", value: 50_000 }] })}><Plus size={14} />جایزه</Button> : undefined} />
        <div className="space-y-2">
          {c.rewards.map((r, i) => (
            <div key={r.id} className="grid items-center gap-2 sm:grid-cols-[2fr_6rem_9rem_8rem_2rem]">
              <input disabled={!canEdit} placeholder="نام جایزه" className={`${fieldCls} !min-h-10`} value={r.name} onChange={(e) => touch({ ...c, rewards: c.rewards.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
              {input(r.cost, (n) => touch({ ...c, rewards: c.rewards.map((x, j) => (j === i ? { ...x, cost: n } : x)) }))}
              <select disabled={!canEdit} className={`${fieldCls} !min-h-10`} value={r.kind} onChange={(e) => touch({ ...c, rewards: c.rewards.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof r.kind } : x)) })}>{Object.entries(REWARD_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {input(r.value, (n) => touch({ ...c, rewards: c.rewards.map((x, j) => (j === i ? { ...x, value: n } : x)) }), "w-32")}
              {canEdit && <button aria-label="حذف جایزه" onClick={() => touch({ ...c, rewards: c.rewards.filter((_, j) => j !== i) })} className="cursor-pointer text-ink3 hover:text-danger"><Trash2 size={14} /></button>}
            </div>
          ))}
          <p className="text-xs text-ink3">ستون‌ها: نام · هزینه (امتیاز) · نوع · ارزش (تومان؛ برای اعتبار، مقدار اضافه‌شده به کیف پول)</p>
        </div>
      </Card>
      {err && <ErrorNote message={err} />}
      {saved && <p className="rounded-xl bg-sagesoft p-3 text-sm text-sage">تنظیمات ذخیره شد؛ از فاکتورهای بعدی اعمال می‌شود.</p>}
      {canEdit && <Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تنظیمات"}</Button>}
    </div>
  );
}

function Hub({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<"members" | "settings">(initialTab === "settings" ? "settings" : "members");
  return (
    <div className="space-y-4">
      <PageTitle title="باشگاه مشتریان" sub="سطح، امتیاز، جایزه و کیف پول مشتریان" />
      <div className="flex gap-2"><Chip active={tab === "members"} onClick={() => setTab("members")}>اعضا</Chip><Chip active={tab === "settings"} onClick={() => setTab("settings")}>تنظیمات</Chip></div>
      {tab === "members" ? <Members /> : <Settings />}
    </div>
  );
}

export function LiveLoyalty({ initialTab }: { initialTab?: string }) {
  return <LiveGate><Hub initialTab={initialTab} /></LiveGate>;
}
