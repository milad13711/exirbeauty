"use client";
import { useState } from "react";
import { Globe, Lock, Star } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type ReviewRow } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const Stars = ({ n }: { n: number }) => <span className="inline-flex text-gold" role="img" aria-label={`${n} ستاره`}>{Array.from({ length: 5 }, (_, k) => <Star key={k} size={14} fill={k < n ? "currentColor" : "none"} />)}</span>;

function Item({ r, onChanged }: { r: ReviewRow; onChanged: () => void }) {
  const [text, setText] = useState(r.reply ?? ""); const [open, setOpen] = useState(false);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) { setErr(""); setBusy(true); try { await fn(); onChanged(); setOpen(false); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <li className="space-y-2 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Stars n={r.rating ?? 0} />
        <b>{r.customerName ?? "مشتری"}</b>
        <span className="text-xs text-ink3">{r.serviceName}{r.staffName ? ` · ${r.staffName}` : ""} · {r.answeredAt ? faDate.short(r.answeredAt.slice(0, 10)) : ""}</span>
        <span className="mr-auto flex gap-1.5">
          {r.route === "PUBLIC" ? <Badge tone="sage"><Globe size={11} />عمومی</Badge> : <Badge tone={r.resolved ? "neutral" : "danger"}><Lock size={11} />{r.resolved ? "حل‌شده" : "شکایت باز"}</Badge>}
        </span>
      </div>
      {r.comment && <p className="leading-7 text-ink2">{r.comment}</p>}
      {r.reply && !open && <p className="rounded-xl bg-surface2 p-3 text-ink2"><b className="text-ink">پاسخ سالن: </b>{r.reply}</p>}
      {open && (
        <div className="space-y-2">
          <Field label="پاسخ سالن"><textarea rows={3} maxLength={1000} className={fieldCls} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          <Button disabled={busy || text.trim().length < 2} onClick={() => run(() => crm.replyReview(r.id, text.trim()))}>ثبت پاسخ</Button>
        </div>
      )}
      {err && <ErrorNote message={err} />}
      <div className="flex gap-2">
        {!open && <Button variant="ghost" onClick={() => setOpen(true)}>{r.reply ? "ویرایش پاسخ" : "پاسخ"}</Button>}
        {r.route === "PRIVATE" && <Button variant="ghost" disabled={busy} onClick={() => run(() => crm.resolveReview(r.id, !r.resolved))}>{r.resolved ? "بازگشایی" : "حل شد"}</Button>}
      </div>
    </li>
  );
}

function Board() {
  const [filter, setFilter] = useState<"all" | "PRIVATE" | "PUBLIC">("all");
  const ov = useQuery(crm.reviewOverview, []);
  const cfg = useQuery(crm.reviewConfig, []);
  const list = useQuery(() => crm.reviews({ status: "answered", route: filter === "all" ? undefined : filter }), [filter]);
  const [err, setErr] = useState("");
  const refresh = () => { void ov.reload(); void list.reload(); };
  async function setThreshold(n: number) { setErr(""); try { await crm.putReviewConfig(n); await cfg.reload(); } catch (e) { setErr(errorText(e)); } }
  if (ov.loading && !ov.data) return <Spinner />;
  if (!ov.data) return <ErrorNote message={errorText(ov.error)} onRetry={ov.reload} />;
  const o = ov.data;
  return (
    <div className="space-y-5">
      <PageTitle title="نظرسنجی و اعتبار سالن" sub="رضایت بالا ← دعوت به نظر عمومی · رضایت پایین ← پیام خصوصی به مدیر" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="میانگین رضایت" value={`${faNum(o.avg.toFixed(1).replace(".", "٫"))} از ۵`} tone="gold" icon={<Star size={16} />} />
        <Stat label="نظرسنجی پاسخ‌داده‌شده" value={faNum(o.answered)} sub={`${faNum(o.pending)} منتظر پاسخ`} tone="sky" />
        <Stat label="نظر عمومی" value={faNum(o.publicCount)} tone="sage" icon={<Globe size={16} />} />
        <Stat label="شکایت باز" value={faNum(o.openPrivate)} tone="danger" icon={<Lock size={16} />} />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <CardHead title="بازخوردها" action={<div className="flex gap-1.5">{([["all", "همه"], ["PRIVATE", "خصوصی"], ["PUBLIC", "عمومی"]] as const).map(([k, l]) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}</div>} />
          {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <p className="text-sm text-ink3">هنوز بازخوردی ثبت نشده است. برای دریافت خودکار، از «پیامک ← سناریوها» «درخواست نظر بعد از خدمت» را روشن کنید.</p> : (
            <ul className="divide-y divide-line">{list.data.map((r) => <Item key={r.id + (r.reply ?? "") + r.resolved} r={r} onChanged={refresh} />)}</ul>
          )}
        </Card>
        <div className="space-y-5">
          <Card className="p-5">
            <CardHead title="توزیع امتیاز" />
            <ul className="space-y-1.5 text-xs">{[5, 4, 3, 2, 1].map((k) => <li key={k} className="flex items-center gap-2"><span className="w-4">{faNum(k)}</span><div className="h-2 flex-1 rounded-full bg-surface2"><div className="h-2 rounded-full bg-gold" style={{ width: `${o.answered ? (o.dist[k - 1] / o.answered) * 100 : 0}%` }} /></div><span className="w-6 text-left text-ink3">{faNum(o.dist[k - 1])}</span></li>)}</ul>
          </Card>
          {o.byStaff.length > 0 && (
            <Card className="p-5">
              <CardHead title="رضایت به تفکیک متخصص" />
              <ul className="space-y-2 text-sm">{o.byStaff.map((s) => <li key={s.staffId} className="flex justify-between"><span>{s.name}</span><b>{faNum(s.avg.toFixed(1).replace(".", "٫"))} <span className="text-xs font-normal text-ink3">({faNum(s.n)})</span></b></li>)}</ul>
            </Card>
          )}
          <Card className="p-5">
            <CardHead title="تنظیمات" />
            <p className="mb-2 text-xs text-ink2">از چه امتیازی به بالا مشتری به ثبت نظر عمومی دعوت شود؟</p>
            <div className="flex gap-1.5">{[3, 4, 5].map((n) => <Chip key={n} active={cfg.data?.threshold === n} onClick={() => setThreshold(n)}>{faNum(n)} ستاره</Chip>)}</div>
            {err && <div className="mt-2"><ErrorNote message={err} /></div>}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Guard() { const me = useMe(); return canManage(me) ? <Board /> : <Card className="p-6 text-sm text-ink2">بازخورد مشتریان فقط برای مالک سالن نمایش داده می‌شود.</Card>; }
export function LiveReviews() { return <LiveGate><Guard /></LiveGate>; }
