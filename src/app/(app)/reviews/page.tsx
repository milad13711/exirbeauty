"use client";
import { useState } from "react";
import clsx from "clsx";
import { EyeOff, Globe, Lock, Send, Star } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Field, PageTitle, Stat, Toggle, fieldCls } from "@/components/ui";
import { useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { dayInfo } from "@/lib/dates";
import { fa } from "@/lib/fa";

const Stars = ({ n }: { n: number }) => <span className="inline-flex text-gold" role="img" aria-label={`${n} ستاره`}>{Array.from({ length: 5 }, (_, k) => <Star key={k} size={14} fill={k < n ? "currentColor" : "none"} />)}</span>;

export default function Reviews() {
  const db = useDB();
  const [cfg, setCfg] = useState(db.reviewCfg);
  const [saved, setSaved] = useState(false);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "private" | "public">("all");
  const answered = db.surveys.filter((s) => s.rating);
  const pending = db.surveys.filter((s) => s.status === "منتظر پاسخ");
  const avg = answered.length ? answered.reduce((a, s) => a + (s.rating ?? 0), 0) / answered.length : 0;
  const openPrivate = answered.filter((s) => s.route === "private" && !s.resolved);
  const rows = answered.filter((s) => filter === "all" || s.route === filter).sort((a, b) => b.day - a.day);
  const byStaff = db.staff.filter((m) => m.active).map((m) => { const r = answered.filter((s) => s.staffId === m.id); return { m, n: r.length, avg: r.length ? r.reduce((a, s) => a + (s.rating ?? 0), 0) / r.length : 0 }; }).filter((x) => x.n).sort((a, b) => b.avg - a.avg);
  const set = (p: Partial<typeof cfg>) => { setCfg({ ...cfg, ...p }); setSaved(false); };

  return (
    <>
      <PageTitle title="نظرسنجی و اعتبار سالن" sub="رضایت بالا ← درخواست نظر عمومی · رضایت پایین ← پیام خصوصی به مدیر" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="میانگین رضایت" value={`${fa(avg.toFixed(1).replace(".", "٫"))} از ۵`} tone="gold" icon={<Star size={16} />} />
        <Stat label="نظرسنجی پاسخ‌داده‌شده" value={fa(answered.length)} sub={`${fa(pending.length)} منتظر پاسخ`} tone="sky" />
        <Stat label="درخواست نظر عمومی" value={fa(answered.filter((s) => s.route === "public").length)} tone="sage" icon={<Globe size={16} />} />
        <Stat label="مشکل خصوصی باز" value={fa(openPrivate.length)} tone="danger" icon={<Lock size={16} />} />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHead title="بازخوردها" action={<div className="flex gap-1.5" role="tablist">{([["all", "همه"], ["private", "خصوصی"], ["public", "عمومی"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={clsx("cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold", filter === k ? "border-rose bg-rose text-white" : "border-line text-ink2")}>{l}</button>)}</div>} />
            <ul className="divide-y divide-line">
              {rows.map((s) => (
                <li key={s.id} className="space-y-2 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={s.name} size={36} />
                    <div className="min-w-0 flex-1 basis-40"><p className="text-sm font-bold">{s.name} <span className="text-xs font-normal text-ink3">· {s.service} · {s.staff} · {s.day === 0 ? "امروز" : dayInfo(s.day).short}</span></p><p className="mt-0.5 text-sm text-ink2">{s.comment || "بدون توضیح"}</p></div>
                    <Stars n={s.rating ?? 0} />
                    {s.route === "public" ? <Badge tone="sage"><Globe size={11} />درخواست نظر عمومی</Badge> : <Badge tone={s.resolved ? "neutral" : "danger"}><EyeOff size={11} />{s.resolved ? "حل‌شده" : "خصوصی · باز"}</Badge>}
                  </div>
                  {s.route === "private" && (
                    s.resolved && s.reply ? <p className="rounded-xl bg-surface2 p-3 text-xs leading-6 text-ink2">پاسخ سالن: {s.reply}</p> : !s.resolved && (
                      <div className="flex flex-wrap gap-2">
                        <input aria-label={`پاسخ به ${s.name}`} value={reply[s.id] ?? ""} onChange={(e) => setReply({ ...reply, [s.id]: e.target.value })} placeholder="پاسخ یا توضیح برای مشتری…" className={`${fieldCls} min-w-0 flex-1 basis-56`} />
                        <Button variant="soft" disabled={(reply[s.id] ?? "").trim().length < 5} onClick={() => ops.replySurvey(s.id, (reply[s.id] ?? "").trim(), true)}><Send size={13} />ارسال و حل‌شده</Button>
                      </div>
                    )
                  )}
                </li>
              ))}
              {!rows.length && <li className="px-5 pb-8 text-center text-sm text-ink3">بازخوردی وجود ندارد.</li>}
            </ul>
          </Card>
          {pending.length > 0 && (
            <Card>
              <CardHead title="منتظر پاسخ مشتری" hint="پیامک نظرسنجی ارسال شده است؛ مشتری در پنل خود پاسخ می‌دهد" />
              <ul className="divide-y divide-line">{pending.map((s) => <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm"><b className="min-w-0 flex-1 truncate">{s.name}</b><span className="text-xs text-ink3">{s.service} · {s.staff}</span><Badge tone="amber">منتظر</Badge></li>)}</ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHead title="تنظیمات نظرسنجی خودکار" />
            <div className="space-y-4 px-5 pb-5 text-sm">
              <div className="flex items-start gap-3"><Toggle on={cfg.auto} label="ارسال خودکار بعد از خدمت" onChange={(v) => set({ auto: v })} /><div><p className="font-semibold">ارسال خودکار بعد از هر فاکتور خدمت</p><p className="text-xs text-ink3">مشتری در پنل خود «نظر شما؟» را می‌بیند</p></div></div>
              <div className="flex items-start gap-3"><Toggle on={cfg.points} label="امتیاز ثبت نظر" onChange={(v) => set({ points: v })} /><div><p className="font-semibold">امتیاز باشگاه برای ثبت نظر</p></div></div>
              <Field label="از چه امتیازی «رضایت بالا» حساب شود؟"><select value={cfg.threshold} onChange={(e) => set({ threshold: +e.target.value })} className={fieldCls}>{[3, 4, 5].map((n) => <option key={n} value={n}>{fa(n)} ستاره و بالاتر ← درخواست نظر عمومی</option>)}</select></Field>
              <Field label="لینک ثبت نظر عمومی (گوگل‌مپ)"><input value={cfg.googleUrl} onChange={(e) => set({ googleUrl: e.target.value })} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} /></Field>
              <div className="flex items-center gap-3"><Button onClick={() => { ops.saveReviewCfg(cfg); setSaved(true); }}>ذخیره</Button>{saved && <span role="status" className="text-xs font-bold text-sage">ذخیره شد ✓</span>}</div>
            </div>
          </Card>
          <Card>
            <CardHead title="رضایت به تفکیک متخصص" />
            <ul className="divide-y divide-line">{byStaff.map(({ m, n, avg: a }) => <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm"><Avatar name={m.name} color={m.color} size={30} /><span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span><span className="text-xs text-ink3">{fa(n)} نظر</span><b className="text-gold">★ {fa(a.toFixed(1).replace(".", "٫"))}</b></li>)}</ul>
          </Card>
        </div>
      </div>
    </>
  );
}
