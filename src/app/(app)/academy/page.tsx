"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Award, BookOpen, Clock, PlayCircle } from "lucide-react";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { fa, short, toman } from "@/lib/fa";

const aud = ["همه", "مدیر سالن", "متخصص"] as const;

export default function Academy() {
  const db = useDB();
  const [a, setA] = useState<(typeof aud)[number]>("همه");
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const wallet = db.wallets.s1 ?? 0;
  const enr = (id: string) => db.enrollments.find((e) => e.courseId === id);
  const list = db.courses.filter((c) => c.published && (a === "همه" || c.audience === a) && (tab === "all" || enr(c.id)));
  const done = db.enrollments.filter((e) => { const c = db.courses.find((x) => x.id === e.courseId); return c && e.done.length >= c.lessons.length; }).length;

  return (
    <>
      <PageTitle title="آکادمی" sub="آموزش برای مدیر سالن و متخصص؛ با گواهی پایان دوره" />
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[[BookOpen, "دوره‌های من", db.enrollments.length], [Award, "تکمیل‌شده", done], [Clock, "اعتبار کیف پول", null]].map(([I, l, v], i) => { const Ic = I as typeof Award; return <Card key={i} className="flex items-center gap-3 p-4"><Ic size={20} className="text-rose" /><div><p className="text-xs text-ink3">{l as string}</p><p className="text-sm font-extrabold">{v === null ? short(wallet) : fa(v as number)}</p></div></Card>; })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1" role="tablist">{([["all", "همه‌ی دوره‌ها"], ["mine", "دوره‌های من"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("cursor-pointer rounded-lg px-4 py-1.5 text-[13px] font-bold", tab === k ? "bg-surface text-rosedeep shadow-sm" : "text-ink2")}>{l}</button>)}</div>
        {aud.map((x) => <button key={x} onClick={() => setA(x)} aria-pressed={a === x} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", a === x ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{x}</button>)}
      </div>
      {msg && <p role="status" className={clsx("mb-4 rounded-xl p-3 text-sm", msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger")}>{msg.t}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => {
          const e = enr(c.id); const inc = ops.includedInPlan(c.inPlan, db.sub.planId); const pct = e ? Math.round((e.done.length / c.lessons.length) * 100) : 0;
          return (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex items-center justify-between"><Badge tone={c.audience === "متخصص" ? "sage" : "rose"}>{c.audience}</Badge>{c.price === 0 ? <Badge tone="gold">رایگان</Badge> : inc ? <Badge tone="sky">شامل پلن شما</Badge> : <b className="text-sm">{toman(c.price)}</b>}</div>
              <h2 className="mt-3 font-bold">{c.title}</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink2">{c.description}</p>
              <p className="mt-2 flex items-center gap-3 text-xs text-ink3"><span className="inline-flex items-center gap-1"><PlayCircle size={13} />{fa(c.lessons.length)} درس</span><span className="inline-flex items-center gap-1"><Clock size={13} />{fa(String(c.hours).replace(".", "٫"))} ساعت</span></p>
              <div className="mt-auto pt-4">
                {e ? (
                  <>
                    <div className="mb-2 h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${pct}%` }} /></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-ink2">{fa(pct)}٪ پیشرفت</span><Link href={`/academy/${c.id}`} className="rounded-xl bg-rose px-4 py-2 text-[13px] font-bold text-white">{pct >= 100 ? "گواهی و مرور" : "ادامه‌ی آموزش"}</Link></div>
                  </>
                ) : <Button className="w-full" onClick={() => { const r = ops.enroll(c.id); setMsg({ ok: r.ok, t: r.msg }); }}>{c.price === 0 || inc ? "ثبت‌نام رایگان" : `ثبت‌نام با کیف پول (${short(c.price)})`}</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      {!list.length && <p className="py-16 text-center text-sm text-ink3">{tab === "mine" ? "هنوز در دوره‌ای ثبت‌نام نکرده‌اید." : "دوره‌ای پیدا نشد."}</p>}
    </>
  );
}
