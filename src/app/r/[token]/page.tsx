"use client";
import { use, useState } from "react";
import { Star } from "lucide-react";
import { Button, Card, Field, fieldCls } from "@/components/ui";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { ApiError, errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { useQuery } from "@/lib/useQuery";

export default function Survey({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const q = useQuery(() => crm.publicReview(token), [token]);
  const [rating, setRating] = useState(0); const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [done, setDone] = useState<{ route: "PUBLIC" | "PRIVATE"; thanks: string } | null>(null);

  if (q.loading && !q.data) return <Spinner />;
  if (q.error instanceof ApiError && q.error.status === 404) return <Card className="p-6 text-center text-sm text-ink2">این لینک نظرسنجی معتبر نیست یا منقضی شده است.</Card>;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const d = q.data;
  if (d.answered && !done) return <Card className="p-6 text-center text-sm text-ink2">شما قبلاً به این نظرسنجی پاسخ داده‌اید. سپاسگزاریم!</Card>;
  if (done) return (
    <Card className="space-y-2 p-6 text-center">
      <p className="text-lg font-extrabold">متشکریم 💛</p>
      <p className="text-sm leading-7 text-ink2">{done.thanks}</p>
    </Card>
  );

  async function submit() {
    setErr(""); setBusy(true);
    try { setDone(await crm.answerReview(token, { rating, comment: comment.trim() })); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const low = rating > 0 && rating < d.threshold;
  return (
    <Card className="space-y-4 p-6">
      <div className="text-center">
        <h1 className="text-lg font-extrabold">{d.salon}</h1>
        <p className="mt-1 text-sm text-ink2">نظر شما درباره‌ی «{d.serviceName}»{d.staffName ? ` با ${d.staffName}` : ""}</p>
      </div>
      <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="امتیاز">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} ستاره`} onClick={() => setRating(n)} className="cursor-pointer p-1 text-gold">
            <Star size={36} fill={n <= rating ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <Field label={low ? "چه چیزی باعث نارضایتی شد؟ (فقط مدیر سالن می‌بیند)" : "اگر مایل هستید توضیح بدهید (اختیاری)"}>
          <textarea rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} className={`${fieldCls} leading-7`} />
        </Field>
      )}
      {err && <ErrorNote message={err} />}
      <Button className="w-full" disabled={busy || rating === 0} onClick={submit}>{busy ? "در حال ارسال…" : "ارسال نظر"}</Button>
    </Card>
  );
}
