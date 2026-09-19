"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button, PageTitle } from "@/components/ui";
import { useDB } from "@/lib/db";
import { answer, suggestions, type Answer } from "@/lib/assistant";

type M = { r: "u"; t: string } | { r: "a"; a: Answer };

export default function AI() {
  const db = useDB();
  const [msgs, setMsgs] = useState<M[]>([{ r: "a", a: { topic: "hello", text: "سلام! من مدیر هوشمند سالن هستم. درباره‌ی فروش، ظرفیت، مشتریان، موجودی و … بپرسید؛ پاسخ‌ها با داده‌ی همین لحظه‌ی سالن شما محاسبه می‌شود." } }]);
  const [v, setV] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  const ask = (q: string) => { if (!q.trim()) return; setMsgs((m) => [...m, { r: "u", t: q }, { r: "a", a: answer(db, q) }]); setV(""); };

  return (
    <>
      <PageTitle title="مدیر هوشمند سالن" sub="از داده‌های زنده‌ی سالن بپرسید؛ پاسخ همراه با پیشنهاد اقدام است" />
      <p className="mb-3 rounded-xl bg-surface2 px-4 py-2 text-xs leading-6 text-ink2">توجه: این نسخه قانون‌محور است و عددها را مستقیم از فروش، نوبت، انبار و مشتریان می‌خواند (مدل زبانی نیست؛ سؤال‌های خارج از حوزه را نمی‌فهمد).</p>
      <div className="flex h-[560px] flex-col rounded-2xl border border-line bg-surface">
        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {msgs.map((m, i) => m.r === "u" ? (
            <div key={i} className="flex justify-start"><p className="max-w-[85%] rounded-2xl bg-plum px-4 py-2.5 text-sm leading-7 text-white">{m.t}</p></div>
          ) : (
            <div key={i} className="flex items-start gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose text-white"><Bot size={16} /></span>
              <div className="max-w-[85%] space-y-2 rounded-2xl bg-rosesoft px-4 py-3 text-sm leading-7 text-ink">
                <p>{m.a.text}</p>
                {m.a.bullets && <ul className="space-y-1 text-[13px] text-ink2">{m.a.bullets.map((b) => <li key={b} className="flex gap-2"><span className="text-rose">•</span>{m.a.topic === "help" ? <button onClick={() => ask(b)} className="cursor-pointer text-right font-semibold text-rosedeep hover:underline">{b}</button> : b}</li>)}</ul>}
                {m.a.actions && <div className="flex flex-wrap gap-2 pt-1">{m.a.actions.map((x) => <Link key={x.label} href={x.href} className="rounded-full bg-surface px-3 py-1 text-[12px] font-bold text-rosedeep hover:bg-white">{x.label} ←</Link>)}</div>}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 pt-3">{suggestions.map((q) => <button key={q} onClick={() => ask(q)} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:bg-surface2">{q}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); ask(v); }} className="flex gap-2 p-4">
          <input value={v} onChange={(e) => setV(e.target.value)} aria-label="سؤال" placeholder="سؤال خود را بنویسید…" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-rose" />
          <Button type="submit"><Send size={14} />ارسال</Button>
        </form>
      </div>
    </>
  );
}
