"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, CardHead, type Tone } from "@/components/ui";
import { useMe } from "@/components/portal/PortalShell";
import { Chip, ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { portal, type PortalAppt } from "@/lib/portalApi";
import { faDate, faNum, fmtMin, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const ST: Record<PortalAppt["status"], { l: string; t: Tone }> = { CONFIRMED: { l: "تأییدشده", t: "sage" }, PENDING: { l: "منتظر تأیید", t: "amber" }, IN_SERVICE: { l: "در حال انجام", t: "rose" }, DONE: { l: "انجام‌شده", t: "neutral" }, CANCELED: { l: "لغوشده", t: "danger" }, NO_SHOW: { l: "غایب", t: "neutral" } };

export default function MyAppointments() {
  const me = useMe();
  const q = useQuery(portal.appointments, []);
  const [tab, setTab] = useState<"up" | "past">("up");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  async function cancel(id: string) {
    if (!confirm("این نوبت لغو شود؟")) return;
    setErr(""); setBusy(id);
    try { await portal.cancel(id); await q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(""); }
  }
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  const rows = q.data.items.filter((a) => (tab === "up" ? a.upcoming : !a.upcoming));
  return (
    <>
      <div className="flex items-center justify-between"><h1 className="text-lg font-extrabold">نوبت‌های من</h1><Link href={`/s/${me.salon.slug}`} className="press rounded-[14px] bg-rosesoft px-4 py-2 text-[13px] font-bold text-rosedeep">نوبت جدید</Link></div>
      <div className="flex gap-2"><Chip active={tab === "up"} onClick={() => setTab("up")}>پیش‌رو</Chip><Chip active={tab === "past"} onClick={() => setTab("past")}>گذشته</Chip></div>
      {err && <ErrorNote message={err} />}
      <Card>
        <CardHead title={tab === "up" ? "نوبت‌های پیش‌رو" : "سابقه"} hint={tab === "up" ? `لغو رایگان تا ${faNum(q.data.cancelHours)} ساعت قبل از نوبت` : undefined} />
        <ul className="divide-y divide-line">
          {rows.map((a) => (
            <li key={a.id} className="space-y-1.5 px-5 py-3.5 text-sm">
              <div className="flex items-center gap-2"><b className="flex-1">{a.serviceName}</b><Badge tone={ST[a.status].t}>{ST[a.status].l}</Badge></div>
              <p className="text-xs text-ink2">{faDate.full(a.date)} · ساعت {fmtMin(a.startMin)} · {a.staffName}{a.price ? ` · ${toman(a.price)}` : ""}</p>
              {a.upcoming && (a.canCancel ? <Button variant="ghost" className="!text-danger" disabled={busy === a.id} onClick={() => cancel(a.id)}>لغو نوبت</Button> : <p className="text-xs text-ink3">مهلت لغو گذشته؛ برای تغییر با سالن تماس بگیرید.</p>)}
            </li>
          ))}
          {!rows.length && <li className="px-5 pb-6 text-center text-sm text-ink3">{tab === "up" ? "نوبت پیش‌رویی ندارید." : "هنوز سابقه‌ای نیست."}</li>}
        </ul>
      </Card>
    </>
  );
}
