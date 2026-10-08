"use client";
import { useState } from "react";
import { Check, Copy, Share2, UserPlus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { ErrorNote, Spinner } from "./ui";
import { crm, type ReferralConfig } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function Settings({ initial }: { initial: ReferralConfig }) {
  const [c, setC] = useState(initial);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const set = (p: Partial<ReferralConfig>) => { setC((x) => ({ ...x, ...p })); setOk(false); };
  async function save() { setErr(""); setBusy(true); try { setC(await crm.putReferralConfig(c)); setOk(true); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Card className="space-y-4 p-5">
      <CardHead title="پاداش‌ها" hint="پاداش پس از اولین فاکتور دوست، یک‌بار برای هر دوست ثبت می‌شود" />
      <div className="flex items-center gap-3"><Toggle on={c.enabled} onChange={(v) => set({ enabled: v })} label="فعال بودن برنامه‌ی معرفی" /><span className="text-sm">{c.enabled ? "برنامه‌ی معرفی فعال است" : "غیرفعال"}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="امتیاز معرف"><input type="number" min={0} value={c.referrerPts} onChange={(e) => set({ referrerPts: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>
        <Field label="تخفیف دوست (٪)"><input type="number" min={0} max={60} value={c.friendOff} onChange={(e) => set({ friendOff: Math.min(60, Math.max(0, +e.target.value || 0)) })} className={fieldCls} /></Field>
      </div>
      <ol className="space-y-1.5 text-sm text-ink2">{["مشتری لینک اختصاصی خود را می‌فرستد", "دوست از لینک نوبت می‌گیرد و در CRM ثبت می‌شود", `در اولین فاکتور، ${faNum(c.friendOff)}٪ تخفیف پیشنهاد می‌شود`, `معرف ${faNum(c.referrerPts)} امتیاز باشگاه می‌گیرد`].map((t, i) => <li key={t} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose text-[11px] font-bold text-white">{faNum(i + 1)}</span>{t}</li>)}</ol>
      {err && <ErrorNote message={err} />}
      <div className="flex items-center gap-3"><Button disabled={busy} onClick={save}>ذخیره</Button>{ok && <span role="status" className="text-sm font-bold text-sage">ذخیره شد ✓</span>}</div>
    </Card>
  );
}

function Lookup() {
  const [q, setQ] = useState(""); const [pick, setPick] = useState<{ id: string; name: string } | null>(null); const [copied, setCopied] = useState(false);
  const found = useQuery(() => (q.trim().length >= 2 && !pick ? crm.customers({ q: q.trim(), limit: 5 }) : Promise.resolve(null)), [q, pick]);
  const tenant = useQuery(crm.tenant, []);
  const st = useQuery(() => (pick ? crm.referralCustomer(pick.id) : Promise.resolve(null)), [pick?.id]);
  const link = st.data && tenant.data ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${tenant.data.slug}?ref=${st.data.code}` : "";
  return (
    <Card className="space-y-3 p-5">
      <CardHead title="لینک معرفی یک مشتری" hint="برای فرستادن از واتساپ یا پیامک" />
      {pick ? <p className="flex items-center justify-between rounded-xl bg-surface2 p-3 text-sm"><b>{pick.name}</b><button className="cursor-pointer text-xs font-bold text-rose" onClick={() => setPick(null)}>تغییر</button></p> : (
        <>
          <input className={fieldCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام یا شماره‌ی مشتری…" />
          {found.data && <div className="flex flex-wrap gap-2">{found.data.items.map((c) => <button key={c.id} onClick={() => setPick({ id: c.id, name: c.name })} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-surface2">{c.name}</button>)}</div>}
        </>
      )}
      {st.data && (
        <div className="space-y-2 text-sm">
          <div className="flex gap-2"><input readOnly dir="ltr" value={link} className={`${fieldCls} !min-h-10 text-xs`} /><Button variant="soft" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? <Check size={14} /> : <Copy size={14} />}کپی</Button></div>
          <p className="text-xs text-ink2">کد: <b dir="ltr">{st.data.code}</b> · {faNum(st.data.friends)} دوست معرفی‌شده · {faNum(st.data.rewardedFriends)} خرید اول · {faNum(st.data.pointsEarned)} امتیاز کسب‌شده</p>
        </div>
      )}
    </Card>
  );
}

function Board() {
  const me = useMe();
  const cfg = useQuery(crm.referralConfig, []);
  const ov = useQuery(crm.referralOverview, []);
  if (!canManage(me)) return <Card className="p-6 text-sm text-ink2">برنامه‌ی معرفی فقط برای مالک سالن در دسترس است.</Card>;
  if ((cfg.loading && !cfg.data) || (ov.loading && !ov.data)) return <Spinner />;
  if (!cfg.data || !ov.data) return <ErrorNote message={errorText(cfg.error ?? ov.error)} onRetry={() => { void cfg.reload(); void ov.reload(); }} />;
  const o = ov.data;
  return (
    <div className="space-y-5">
      <PageTitle title="معرفی دوستان" sub="هر مشتری لینک اختصاصی دارد؛ پاداش پس از اولین فاکتور دوست خودکار ثبت می‌شود" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="مشتری معرفی‌شده" value={faNum(o.referred)} tone="rose" icon={<UserPlus size={16} />} />
        <Stat label="اولین خرید انجام‌شده" value={faNum(o.converted)} tone="sage" />
        <Stat label="نرخ تبدیل" value={o.referred ? `${faNum(Math.round((o.converted / o.referred) * 100))}٪` : "—"} tone="gold" />
        <Stat label="معرف‌های فعال" value={faNum(o.top.length)} tone="sky" icon={<Share2 size={16} />} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Settings initial={cfg.data} />
        <Lookup />
      </div>
      <Card className="p-5">
        <CardHead title="دوستان معرفی‌شده" />
        {!o.rows.length ? <p className="text-sm text-ink3">هنوز دوستی از طریق لینک ثبت نشده است.</p> : (
          <ul className="divide-y divide-line text-sm">
            {o.rows.map((r) => (
              <li key={r.friendId} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1"><b>{r.friend}</b><span className="mr-2 text-xs text-ink3">معرف: {r.referrer} · {faDate.short(r.at.slice(0, 10))}</span></span>
                {r.rewarded ? <Badge tone="sage">+{faNum(r.points)} امتیاز</Badge> : <Badge tone="neutral">منتظر اولین خرید</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function LiveReferral() { return <LiveGate><Board /></LiveGate>; }
