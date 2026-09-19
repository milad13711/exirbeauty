"use client";
import { useState } from "react";
import clsx from "clsx";
import { ExternalLink, Star } from "lucide-react";
import { Button, Card, fieldCls } from "@/components/ui";
import { useDB, type Survey } from "@/lib/db";
import { ops } from "@/lib/ops";

export function SurveyCard({ s }: { s: Survey }) {
  const db = useDB();
  const [rate, setRate] = useState(0);
  const [text, setText] = useState("");
  const [res, setRes] = useState<"public" | "private" | null>(null);
  const submit = () => { if (rate) setRes(ops.submitSurvey(s.id, rate, text.trim()).route); };

  if (res) return (
    <Card className="space-y-2 p-5 text-center">
      <p className="font-bold">ممنون از بازخوردتان 💗</p>
      {res === "public" ? (
        <>
          <p className="text-sm text-ink2">خوشحالیم که راضی بودید! اگر مایل باشید، تجربه‌تان را در گوگل‌مپ هم بنویسید.</p>
          <a href={db.reviewCfg.googleUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-rose px-4 py-2.5 text-[13px] font-bold text-white"><ExternalLink size={14} />ثبت نظر در گوگل‌مپ</a>
        </>
      ) : <p className="text-sm text-ink2">متأسفیم که تجربه‌ی خوبی نداشتید. پیام شما مستقیم برای مدیر سالن ارسال شد و پیگیری می‌کنیم.</p>}
    </Card>
  );
  return (
    <Card className="space-y-3 border-rose/30 bg-rosesoft/40 p-5">
      <p className="text-sm font-bold">از تجربه‌ی امروزتان ({s.service} · {s.staff}) چقدر راضی بودید؟</p>
      <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="امتیاز">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={rate === n} aria-label={`${n} ستاره`} onClick={() => setRate(n)} className="cursor-pointer p-1"><Star size={30} className={clsx(n <= rate ? "text-gold" : "text-ink3")} fill={n <= rate ? "currentColor" : "none"} /></button>)}
      </div>
      {rate > 0 && <textarea aria-label="توضیح" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={rate >= db.reviewCfg.threshold ? "دوست دارید چه چیزی را بگویید؟ (اختیاری)" : "چه چیزی می‌توانستیم بهتر انجام دهیم؟"} className={fieldCls} />}
      <Button className="w-full" disabled={!rate} onClick={submit}>ارسال نظر{db.reviewCfg.points ? " و دریافت امتیاز" : ""}</Button>
    </Card>
  );
}
