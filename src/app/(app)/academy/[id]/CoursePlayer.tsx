"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Award, Check, ChevronRight, Printer } from "lucide-react";
import { Button, Card, CardHead } from "@/components/ui";
import { useDB } from "@/lib/db";
import { ops } from "@/lib/ops";
import { dayInfo } from "@/lib/dates";
import { fa } from "@/lib/fa";

export function CoursePlayer({ id }: { id: string }) {
  const db = useDB();
  const c = db.courses.find((x) => x.id === id);
  const e = db.enrollments.find((x) => x.courseId === id);
  const [sel, setSel] = useState<string | null>(null);
  if (!c) return <div className="py-20 text-center text-ink2">دوره پیدا نشد. <Link href="/academy" className="font-bold text-rose">بازگشت</Link></div>;
  if (!e) return <div className="py-20 text-center"><p className="text-ink2">برای دیدن این دوره ابتدا ثبت‌نام کنید.</p><Link href="/academy" className="mt-3 inline-block font-bold text-rose">بازگشت به آکادمی</Link></div>;

  const cur = c.lessons.find((l) => l.id === sel) ?? c.lessons.find((l) => !e.done.includes(l.id)) ?? c.lessons[0];
  const idx = c.lessons.findIndex((l) => l.id === cur.id);
  const doneAll = e.done.length >= c.lessons.length;
  const pct = Math.round((e.done.length / c.lessons.length) * 100);
  const isDone = e.done.includes(cur.id);

  return (
    <>
      <Link href="/academy" className="mb-3 inline-flex items-center gap-1 text-sm text-ink2 hover:text-ink"><ChevronRight size={15} />آکادمی</Link>
      <h1 className="text-xl font-extrabold">{c.title}</h1>
      <div className="mb-5 mt-2 flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${pct}%` }} /></div><span className="text-xs font-bold text-ink2">{fa(pct)}٪</span></div>

      <div className="grid items-start gap-5 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHead title="درس‌ها" />
          <ol className="divide-y divide-line">
            {c.lessons.map((l, i) => (
              <li key={l.id}><button onClick={() => setSel(l.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-right text-sm", l.id === cur.id ? "bg-rosesoft font-bold text-rosedeep" : "hover:bg-surface2")}>
                <span className={clsx("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", e.done.includes(l.id) ? "bg-sage text-white" : "bg-surface2 text-ink2")}>{e.done.includes(l.id) ? <Check size={13} /> : fa(i + 1)}</span>
                <span className="min-w-0 flex-1">{l.title}<span className="block text-[11px] font-normal text-ink3">{fa(l.minutes)} دقیقه</span></span>
              </button></li>
            ))}
          </ol>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card className="p-6">
            <p className="text-xs text-ink3">درس {fa(idx + 1)} از {fa(c.lessons.length)}</p>
            <h2 className="mt-1 text-lg font-extrabold">{cur.title}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-ink2">{cur.body}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              {isDone ? <span className="inline-flex items-center gap-1.5 text-sm font-bold text-sage"><Check size={16} />این درس تمام شده است</span> : <Button onClick={() => { ops.completeLesson(c.id, cur.id); const nx = c.lessons[idx + 1]; if (nx) setSel(nx.id); }}><Check size={14} />درس را تمام کردم</Button>}
              {idx < c.lessons.length - 1 && <Button variant="ghost" onClick={() => setSel(c.lessons[idx + 1].id)}>درس بعدی</Button>}
            </div>
          </Card>

          {doneAll && (
            <Card className="border-gold/40 bg-goldsoft/50 p-8 text-center">
              <Award size={40} className="mx-auto text-gold" />
              <p className="mt-3 text-xs text-ink2">گواهی پایان دوره</p>
              <p className="mt-2 text-lg font-extrabold">{db.session?.name ?? db.users[0]?.name ?? "مدیر سالن"}</p>
              <p className="mt-1 text-sm text-ink2">دوره‌ی «{c.title}» را با موفقیت به پایان رساند</p>
              <p className="mt-1 text-xs text-ink3">{db.salon.name} · {dayInfo(0).full}</p>
              <Button variant="ghost" className="mt-4" onClick={() => window.print()}><Printer size={14} />چاپ گواهی</Button>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
