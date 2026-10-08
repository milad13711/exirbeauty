"use client";
import Link from "next/link";
import { useState } from "react";
import { Award, BookOpen, CheckCircle2, Circle, Clock, PlayCircle } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle } from "@/components/ui";
import { LiveGate } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type CourseCard, type Certificate } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate, faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const AUD = { ALL: "همه", OWNER: "مدیر سالن", STAFF: "متخصص" } as const;

function Courses() {
  const q = useQuery(crm.courses, []);
  const [tab, setTab] = useState<"all" | "mine">("all"); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState("");
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const list = q.data.filter((c) => tab === "all" || c.enrolled);
  async function enroll(c: CourseCard) {
    setMsg(""); setBusy(c.id);
    try {
      if (c.free) { await crm.enrollCourse(c.id); await q.reload(); } else { window.location.assign((await crm.payCourse(c.id)).paymentUrl); }
    } catch (e) { setMsg(errorText(e)); } finally { setBusy(""); }
  }
  return (
    <div className="space-y-5">
      <PageTitle title="آکادمی" sub="آموزش برای مدیر سالن و متخصص؛ با گواهی پایان دوره" />
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 p-4"><BookOpen size={20} className="text-rose" /><div><p className="text-xs text-ink3">دوره‌های من</p><p className="text-sm font-extrabold">{faNum(q.data.filter((c) => c.enrolled).length)}</p></div></Card>
        <Card className="flex items-center gap-3 p-4"><Award size={20} className="text-rose" /><div><p className="text-xs text-ink3">تکمیل‌شده</p><p className="text-sm font-extrabold">{faNum(q.data.filter((c) => c.completed).length)}</p></div></Card>
      </div>
      <div className="flex gap-2"><Chip active={tab === "all"} onClick={() => setTab("all")}>همه‌ی دوره‌ها</Chip><Chip active={tab === "mine"} onClick={() => setTab("mine")}>دوره‌های من</Chip></div>
      {msg && <ErrorNote message={msg} />}
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((c) => (
          <Card key={c.id} className="flex flex-col p-5">
            <div className="flex items-center justify-between"><Badge tone={c.audience === "STAFF" ? "sage" : "rose"}>{AUD[c.audience]}</Badge>{c.price === 0 ? <Badge tone="gold">رایگان</Badge> : c.free ? <Badge tone="sky">شامل پلن شما</Badge> : <b className="text-sm">{toman(c.price)}</b>}</div>
            <h2 className="mt-3 font-bold">{c.title}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink2">{c.description}</p>
            <p className="mt-2 flex items-center gap-3 text-xs text-ink3"><span className="inline-flex items-center gap-1"><PlayCircle size={13} />{faNum(c.lessonCount)} درس</span><span className="inline-flex items-center gap-1"><Clock size={13} />{faNum(String(c.hours).replace(".", "٫"))} ساعت</span></p>
            <div className="mt-auto pt-4">
              {c.enrolled ? (
                <>
                  <div className="mb-2 h-2 rounded-full bg-surface2"><div className="h-2 rounded-full bg-sage" style={{ width: `${c.progress}%` }} /></div>
                  <div className="flex items-center justify-between"><span className="text-xs text-ink2">{faNum(c.progress)}٪ پیشرفت</span><Link href={`/academy/${c.id}`} className="rounded-xl bg-rose px-4 py-2 text-[13px] font-bold text-white">{c.completed ? "گواهی و مرور" : "ادامه‌ی آموزش"}</Link></div>
                </>
              ) : <Button className="w-full" disabled={busy === c.id} onClick={() => enroll(c)}>{c.free ? "ثبت‌نام رایگان" : `ثبت‌نام و پرداخت ${toman(c.price)}`}</Button>}
            </div>
          </Card>
        ))}
      </div>
      {!list.length && <p className="py-16 text-center text-sm text-ink3">{tab === "mine" ? "هنوز در دوره‌ای ثبت‌نام نکرده‌اید." : "دوره‌ای پیدا نشد."}</p>}
    </div>
  );
}

function CertificateView({ c }: { c: Certificate }) {
  return (
    <Card className="space-y-2 border-2 border-gold/60 p-8 text-center">
      <Award className="mx-auto text-gold" size={36} />
      <p className="text-xs text-ink3">گواهی پایان دوره · {c.serial}</p>
      <p className="text-lg font-extrabold">{c.name}</p>
      <p className="text-sm text-ink2">دوره‌ی «{c.course}» ({faNum(String(c.hours).replace(".", "٫"))} ساعت) را در {c.salon} با موفقیت به پایان رساند.</p>
      <p className="text-xs text-ink3">{faDate.full(c.completedAt.slice(0, 10))}</p>
    </Card>
  );
}

function Player({ id }: { id: string }) {
  const q = useQuery(() => crm.course(id), [id]);
  const cert = useQuery(() => (q.data?.completed && q.data.enrollmentId ? crm.certificate(q.data.enrollmentId) : Promise.resolve(null)), [q.data?.completed, q.data?.enrollmentId]);
  const [open, setOpen] = useState(0); const [err, setErr] = useState("");
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const c = q.data;
  async function done(n: number) { setErr(""); try { await crm.completeLesson(id, n); await q.reload(); } catch (e) { setErr(errorText(e)); } }
  const lesson = c.lessons[open];
  return (
    <div className="space-y-4">
      <PageTitle title={c.title} sub={`${faNum(c.progress)}٪ پیشرفت · ${faNum(c.lessonCount)} درس`} actions={<Link href="/academy" className="rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2">همه‌ی دوره‌ها</Link>} />
      {!c.enrolled && <Card className="p-5 text-sm text-ink2">برای دیدن متن درس‌ها ابتدا در دوره ثبت‌نام کنید.</Card>}
      {cert.data && <CertificateView c={cert.data} />}
      {err && <ErrorNote message={err} />}
      <div className="grid items-start gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="p-3"><ul className="space-y-1">{c.lessons.map((l, i) => (
          <li key={i}><button onClick={() => setOpen(i)} className={`flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-right text-sm ${open === i ? "bg-rosesoft font-bold text-rosedeep" : "hover:bg-surface2"}`}>{c.done.includes(i) ? <CheckCircle2 size={16} className="text-sage" /> : <Circle size={16} className="text-ink3" />}<span className="flex-1">{l.title}</span><span className="text-[11px] text-ink3">{faNum(l.minutes)}د</span></button></li>
        ))}</ul></Card>
        <Card className="space-y-3 p-5">
          <CardHead title={lesson.title} hint={`${faNum(lesson.minutes)} دقیقه`} />
          {lesson.body !== undefined ? <p className="whitespace-pre-line text-sm leading-8 text-ink2">{lesson.body || "متن این درس هنوز اضافه نشده است."}</p> : <p className="text-sm text-ink3">پس از ثبت‌نام قابل مشاهده است.</p>}
          {c.enrolled && <Button disabled={c.done.includes(open)} onClick={() => done(open)}>{c.done.includes(open) ? "این درس را تمام کرده‌اید" : "تمام شد"}</Button>}
        </Card>
      </div>
    </div>
  );
}

export function LiveAcademy() { return <LiveGate><Courses /></LiveGate>; }
export function LiveCoursePlayer({ id }: { id: string }) { return <LiveGate><Player id={id} /></LiveGate>; }
