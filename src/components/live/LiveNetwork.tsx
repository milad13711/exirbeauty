"use client";
import { useState } from "react";
import { Armchair, Briefcase, Camera, Check, Landmark, Lightbulb, Megaphone, Palette, Shield, UserPlus, Wrench, type LucideIcon } from "lucide-react";
import { Badge, Button, Card, CardHead, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { ErrorNote, Spinner } from "./ui";
import { crm } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { faDate } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const ICON: Record<string, LucideIcon> = { "بیمه": Shield, "خدمات مالی": Landmark, "تجهیزات": Wrench, "اجاره صندلی": Armchair, "استخدام متخصص": UserPlus, "تأمین مواد": Briefcase, "تبلیغات": Megaphone, "عکاسی": Camera, "طراحی": Palette, "مشاوره کسب‌وکار": Lightbulb };
const ST: Record<string, { l: string; t: Tone }> = { SUBMITTED: { l: "ثبت شد", t: "amber" }, REVIEWING: { l: "در حال بررسی", t: "sky" }, ANSWERED: { l: "پاسخ داده شد", t: "sage" } };

function Board() {
  const me = useMe();
  const cats = useQuery(crm.networkCategories, []);
  const reqs = useQuery(crm.networkRequests, []);
  const [open, setOpen] = useState<string | null>(null); const [note, setNote] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  if (!canManage(me)) return <Card className="p-6 text-sm text-ink2">این بخش فقط برای مالک سالن در دسترس است.</Card>;
  if ((cats.loading && !cats.data) || (reqs.loading && !reqs.data)) return <Spinner />;
  if (!cats.data || !reqs.data) return <ErrorNote message={errorText(cats.error ?? reqs.error)} onRetry={() => { void cats.reload(); void reqs.reload(); }} />;
  const requests = reqs.data;
  async function send(category: string) { setErr(""); setBusy(true); try { await crm.requestNetwork(category, note.trim()); setOpen(null); setNote(""); await reqs.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <div className="space-y-5">
      <PageTitle title="شبکه خدمات جانبی" sub="سالن فقط نرم‌افزار نمی‌خرد؛ وارد یک شبکه‌ی تخصصی کسب‌وکار می‌شود. درخواست بدهید تا تیم اکسیر با شما تماس بگیرد" />
      {err && <ErrorNote message={err} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.data.map((c) => {
          const I = ICON[c.id] ?? Briefcase;
          const pending = requests.some((r) => r.category === c.id && r.status !== "ANSWERED");
          return (
            <Card key={c.id} className="flex flex-col p-5">
              <span className="grid size-11 place-items-center rounded-2xl bg-rosesoft text-rose"><I size={21} /></span>
              <p className="mt-3 font-bold">{c.id}</p>
              <p className="mt-1 flex-1 text-xs leading-6 text-ink2">{c.description}</p>
              {open === c.id ? (
                <div className="mt-3 space-y-2">
                  <input autoFocus value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="توضیح کوتاه (اختیاری)" aria-label="توضیح درخواست" className={fieldCls} />
                  <div className="flex gap-2"><Button className="flex-1" disabled={busy} onClick={() => send(c.id)}>ارسال درخواست</Button><Button variant="ghost" onClick={() => setOpen(null)}>انصراف</Button></div>
                </div>
              ) : pending ? <Badge tone="sky" className="mt-3 w-fit"><Check size={12} />درخواست شما در دست بررسی است</Badge>
                : <Button variant="soft" className="mt-3" onClick={() => { setOpen(c.id); setNote(""); }}>درخواست مشاوره</Button>}
            </Card>
          );
        })}
      </div>
      {requests.length > 0 && (
        <Card className="p-5">
          <CardHead title="درخواست‌های شما" />
          <ul className="divide-y divide-line">
            {requests.slice(0, 10).map((r) => (
              <li key={r.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><b className="flex-1 basis-32">{r.category}</b><span className="min-w-0 flex-[2] basis-40 truncate text-xs text-ink3">{r.note || "—"}</span><span className="text-xs text-ink3">{faDate.short(r.createdAt.slice(0, 10))}</span><Badge tone={ST[r.status].t}>{ST[r.status].l}</Badge></div>
                {r.response && <p className="rounded-xl bg-sagesoft p-3 text-sage">پاسخ اکسیر: {r.response}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function LiveNetwork() { return <LiveGate><Board /></LiveGate>; }
