"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ExternalLink, Package, Percent, ShoppingBag, Wallet } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, Stat, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, shortToman, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const CS: Record<string, { l: string; t: Tone }> = { NONE: { l: "بدون پورسانت", t: "neutral" }, WAITING: { l: "در انتظار مهلت مرجوعی", t: "amber" }, CREDITED: { l: "شارژ شد", t: "sage" }, VOID: { l: "لغو شد", t: "danger" } };
const ST: Record<string, string> = { PAID: "پرداخت‌شده", SHIPPED: "ارسال‌شده", DELIVERED: "تحویل‌شده", RETURNED: "مرجوعی" };

function Board({ withWallet }: { withWallet: boolean }) {
  const me = useMe();
  const ov = useQuery(crm.shopOverview, []);
  const wl = useQuery(() => (withWallet ? crm.shopWallet() : Promise.resolve(null)), [withWallet]);
  const plans = useQuery(() => (withWallet ? crm.plans() : Promise.resolve([])), [withWallet]);
  const tenant = useQuery(crm.tenant, []);
  const [copied, setCopied] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [months, setMonths] = useState(1); const [busy, setBusy] = useState(false);
  if (!canManage(me)) return <Card className="p-6 text-sm text-ink2">این بخش فقط برای مالک سالن در دسترس است.</Card>;
  if (ov.loading && !ov.data) return <Spinner />;
  if (!ov.data) return <ErrorNote message={errorText(ov.error)} onRetry={ov.reload} />;
  const o = ov.data;
  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/store?ref=${o.slug}`;
  const plan = plans.data?.find((p) => p.code === tenant.data?.subscription?.planCode);
  const price = (plan?.priceMonthly ?? 0) * months;
  async function payPartial() {
    if (!plan) return;
    setMsg(null); setBusy(true);
    try {
      const r = await crm.shopPayPlanPartial(plan.code, months);
      if (r.paid) { setMsg({ ok: true, t: "اشتراک کامل از کیف پول پرداخت شد." }); await Promise.all([wl.reload(), ov.reload(), tenant.reload()]); }
      else if (r.paymentUrl) window.location.assign(r.paymentUrl);
    } catch (e) { setMsg({ ok: false, t: errorText(e) }); } finally { setBusy(false); }
  }
  async function pay() {
    if (!plan) return;
    setMsg(null); setBusy(true);
    try { await crm.shopPayPlan(plan.code, months); setMsg({ ok: true, t: `اشتراک ${plan.title} برای ${faNum(months)} ماه از کیف پول پرداخت شد.` }); await Promise.all([wl.reload(), ov.reload(), tenant.reload()]); } catch (e) { setMsg({ ok: false, t: errorText(e) }); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <PageTitle title={withWallet ? "فروشگاه اکسیر و درآمد معرفی" : "فروشگاه آنلاین"} sub="به مشتریان محصول معرفی کنید؛ پورسانت هر خرید پس از مهلت مرجوعی به کیف پول سالن می‌رود" actions={<Link href={`/store?ref=${o.slug}`} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2"><ExternalLink size={14} />دیدن فروشگاه</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="سفارش از لینک شما" value={faNum(o.orders)} tone="sky" icon={<ShoppingBag size={16} />} />
        <Stat label="پورسانت واریزشده" value={shortToman(o.credited)} tone="sage" icon={<Percent size={16} />} />
        <Stat label="در انتظار مهلت مرجوعی" value={shortToman(o.pending)} tone="amber" sub="۷ روز پس از تحویل" />
        <Stat label="موجودی کیف پول سالن" value={shortToman(o.wallet)} tone="rose" icon={<Wallet size={16} />} />
      </div>
      <Card className="p-5">
        <p className="text-sm font-bold">لینک اختصاصی فروشگاه شما</p>
        <p className="mt-1 text-xs leading-6 text-ink3">در پیامک، اینستاگرام یا پیام بعد از خدمت بگذارید؛ هر خریدی از این لینک به نام سالن شما ثبت می‌شود (خرید خودِ سالن و پرسنلش پورسانت ندارد).</p>
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-surface2 p-2 pr-3">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-left text-xs text-ink2">{link}</span>
          <Button variant="ghost" onClick={() => { navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "کپی شد" : "کپی"}</Button>
        </div>
      </Card>
      {withWallet && wl.data && (
        <Card className="space-y-3 p-5">
          <CardHead title="پرداخت اشتراک با کیف پول" hint={plan ? `پلن فعلی: ${plan.title} · ${toman(plan.priceMonthly)} در ماه` : undefined} />
          <div className="flex flex-wrap gap-2">{[1, 3, 6].map((m) => <Chip key={m} active={months === m} onClick={() => setMonths(m)}>{faNum(m)} ماه</Chip>)}</div>
          {plan && plan.priceMonthly > 0 ? (
            <>
              <div className="mb-1 flex justify-between text-sm"><span>کیف پول <b>{faNum(Math.min(100, Math.round((wl.data.balance / price) * 100)))}٪</b> مبلغ را پوشش می‌دهد</span><span className="text-ink3">{toman(price)}</span></div>
              <div className="h-3 rounded-full bg-surface2"><div className="h-3 rounded-full bg-sage" style={{ width: `${Math.min(100, Math.round((wl.data.balance / price) * 100))}%` }} /></div>
              <div className="flex flex-wrap gap-2">
                {wl.data.balance >= price ? <Button disabled={busy} onClick={pay}>پرداخت کامل از کیف پول</Button> : <Button disabled={busy || wl.data.balance <= 0} onClick={payPartial}>{`کسر ${toman(wl.data.balance)} از کیف پول و پرداخت مابقی (${toman(price - wl.data.balance)}) آنلاین`}</Button>}
              </div>
              <p className="text-xs text-ink3">اگر پرداخت آنلاین لغو یا ناموفق شود، مبلغ کسرشده به کیف پول برمی‌گردد.</p>
            </>
          ) : <p className="text-sm text-ink3">پلن فعلی شما رایگان است.</p>}
          {msg && <p role="status" className={`rounded-xl p-2.5 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
        </Card>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <CardHead title="سفارش‌های شما" hint="آخرین خریدها از لینک اختصاصی" />
          {!o.recent.length ? <p className="py-6 text-center text-sm text-ink3">هنوز سفارشی از لینک شما ثبت نشده است.</p> : (
            <ul className="divide-y divide-line">
              {o.recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-32"><b className="block truncate">#{faNum(r.number)} · {r.customer}</b><span className="text-xs text-ink3">{faDate.short(r.createdAt.slice(0, 10))} · {ST[r.status] ?? r.status} · {r.items.join("، ")}</span></span>
                  <span className="text-xs font-bold text-ink2">{shortToman(r.total)}</span>
                  <Badge tone={CS[r.commissionStatus].t}>{r.commission ? `${shortToman(r.commission)} · ` : ""}{CS[r.commissionStatus].l}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <CardHead title="پرفروش‌ترین محصولات شما" />
          {!o.top.length ? <p className="py-6 text-center text-sm text-ink3">با اولین سفارش، آمار محصولات اینجا می‌آید.</p> : (
            <ul className="divide-y divide-line">{o.top.map((p) => <li key={p.name} className="flex items-center gap-3 py-3 text-sm"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-goldsoft text-gold"><Package size={17} /></span><span className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><span className="text-xs text-ink3">{faNum(p.qty)} عدد</span></span><b>{shortToman(p.revenue)}</b></li>)}</ul>
          )}
          {withWallet && wl.data && wl.data.log.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 text-xs font-bold text-ink3">گردش کیف پول</p>
              <ul className="space-y-1 text-xs">{wl.data.log.slice(0, 6).map((l) => <li key={l.id} className="flex justify-between"><span className="text-ink2">{l.note}</span><b className={l.delta > 0 ? "text-sage" : "text-ink2"}>{l.delta > 0 ? "+" : ""}{toman(l.delta)}</b></li>)}</ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function LiveShop({ withWallet = false }: { withWallet?: boolean }) { return <LiveGate><Board withWallet={withWallet} /></LiveGate>; }
