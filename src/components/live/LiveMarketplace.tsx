"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Star } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { ErrorNote, Spinner } from "./ui";
import { crm, type Staff } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const LISTING: Record<string, { l: string; t: Tone }> = { PUBLISHED: { l: "منتشرشده", t: "sage" }, PENDING: { l: "در انتظار تأیید", t: "amber" }, REJECTED: { l: "ردشده", t: "danger" } };

function StaffCard({ s, onSaved }: { s: Staff; onSaved: () => void }) {
  const [bio, setBio] = useState(s.bio); const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) { setErr(""); setOk(false); setBusy(true); try { await fn(); setOk(true); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Card>
      <CardHead title={s.name} hint={s.title} action={<span className="flex items-center gap-2 text-xs text-ink2">{s.listed ? <Eye size={14} className="text-sage" /> : <EyeOff size={14} />}<Toggle on={s.listed} label={`نمایش ${s.name} در مارکت‌پلیس`} onChange={(v) => run(() => crm.updateStaff(s.id, { listed: v }))} /></span>} />
      <div className="space-y-3 px-5 pb-5">
        <Field label="معرفی کوتاه (نمایش عمومی)"><textarea rows={3} value={bio} onChange={(e) => { setBio(e.target.value); setOk(false); }} placeholder="مثلاً متخصص رنگ و بالیاژ با ۸ سال سابقه…" className={fieldCls} /></Field>
        {err && <ErrorNote message={err} />}
        <div className="flex items-center gap-3"><Button variant="soft" disabled={busy || bio === s.bio} onClick={() => run(() => crm.updateStaff(s.id, { bio: bio.trim() }))}>ذخیره</Button>{ok && <span role="status" className="text-xs font-bold text-sage">ذخیره شد ✓</span>}</div>
      </div>
    </Card>
  );
}

function Board() {
  const me = useMe();
  const ov = useQuery(crm.marketOverview, []);
  const staff = useQuery(() => crm.staff(), []);
  const leads = useQuery(crm.marketLeads, []);
  const reviews = useQuery(crm.marketReviews, []);
  const [err, setErr] = useState("");
  if (!canManage(me)) return <Card className="p-6 text-sm text-ink2">این بخش فقط برای مالک سالن در دسترس است.</Card>;
  if (ov.loading && !ov.data) return <Spinner />;
  if (!ov.data) return <ErrorNote message={errorText(ov.error)} onRetry={ov.reload} />;
  const o = ov.data;
  async function convert(id: string) { setErr(""); try { await crm.convertLead(id); await leads.reload(); } catch (e) { setErr(errorText(e)); } }
  return (
    <div className="space-y-5">
      <PageTitle title="مارکت‌پلیس متخصص‌ها" sub="حضور سالن شما روی نقشه‌ی اکسیر و مشتریان تازه‌ای که از آنجا می‌آیند" actions={<Link href="/finder" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2"><Eye size={14} />دیدن نقشه‌ی عمومی</Link>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="وضعیت لیست" value={o.listing ? LISTING[o.listing.status]?.l ?? o.listing.status : "ثبت نشده"} tone={o.listing?.status === "PUBLISHED" ? "sage" : "amber"} />
        <Stat label="متخصص‌های نمایش‌داده‌شده" value={`${faNum(o.staff.listed)} از ${faNum(o.staff.active)}`} tone="rose" />
        <Stat label="امتیاز عمومی" value={o.rating.count ? `${faNum(o.rating.avg.toFixed(1).replace(".", "٫"))} (${faNum(o.rating.count)})` : "—"} tone="gold" icon={<Star size={16} />} />
        <Stat label="درخواست مشتری تازه" value={faNum(o.leads)} tone="sky" />
      </div>
      {!o.listing && <Card className="p-5 text-sm leading-7 text-ink2">برای این سالن لیستی روی نقشه ثبت نشده است. از صفحه‌ی <Link href="/finder/join" className="font-bold text-rose">ثبت‌نام روی نقشه</Link> شروع کنید.</Card>}
      {err && <ErrorNote message={err} />}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <CardHead title="درخواست‌های مشتریان" hint="کسانی که از نقشه برای شما پیام گذاشته‌اند" />
          {leads.loading && !leads.data ? <Spinner /> : !leads.data?.length ? <p className="text-sm text-ink3">هنوز درخواستی نرسیده است.</p> : (
            <ul className="divide-y divide-line text-sm">
              {leads.data.map((l) => (
                <li key={l.id} className="space-y-1 py-3">
                  <div className="flex items-center gap-2"><b className="flex-1">{l.name}</b><bdi dir="ltr" className="text-xs text-ink3">{l.phone}</bdi></div>
                  {l.note && <p className="text-ink2">{l.note}</p>}
                  <div className="flex items-center gap-2 text-xs text-ink3">{faDate.short(l.createdAt.slice(0, 10))}{l.customerId ? <Badge tone="sage">مشتری شما</Badge> : <Button variant="soft" onClick={() => convert(l.id)}>افزودن به مشتریان</Button>}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <CardHead title="نظرهای عمومی" />
          {reviews.loading && !reviews.data ? <Spinner /> : !reviews.data?.length ? <p className="text-sm text-ink3">هنوز نظری ثبت نشده است.</p> : (
            <ul className="divide-y divide-line text-sm">
              {reviews.data.map((r) => <li key={r.id} className="space-y-1 py-3"><div className="flex items-center gap-2"><b className="flex-1">{r.name}</b><span className="inline-flex text-gold">{Array.from({ length: 5 }, (_, k) => <Star key={k} size={13} fill={k < r.rating ? "currentColor" : "none"} />)}</span></div><p className="text-ink2">{r.text}</p></li>)}
            </ul>
          )}
        </Card>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-extrabold text-ink2">متخصص‌های سالن در مارکت‌پلیس</h2>
        {staff.loading && !staff.data ? <Spinner /> : (
          <div className="grid gap-4 md:grid-cols-2">{staff.data?.filter((s) => s.active).map((s) => <div key={s.id + s.bio + s.listed}><StaffCard s={s} onSaved={() => { void staff.reload(); void ov.reload(); }} /></div>)}</div>
        )}
      </div>
    </div>
  );
}

export function LiveMarketplace() { return <LiveGate><Board /></LiveGate>; }
