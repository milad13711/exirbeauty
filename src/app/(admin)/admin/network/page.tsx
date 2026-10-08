"use client";
import { useState } from "react";
import { Badge, Button, Card, CardHead, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { Chip, ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faDate } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const ST: Record<string, { l: string; t: Tone }> = { SUBMITTED: { l: "ثبت شد", t: "amber" }, REVIEWING: { l: "در حال بررسی", t: "sky" }, ANSWERED: { l: "پاسخ داده شد", t: "sage" } };

function Queue() {
  const [f, setF] = useState<string | undefined>("SUBMITTED");
  const q = useQuery(() => crm.adminNetwork(f), [f]);
  const [resp, setResp] = useState<Record<string, string>>({}); const [err, setErr] = useState("");
  async function act(id: string, status: "REVIEWING" | "ANSWERED") { setErr(""); try { await crm.adminNetworkUpdate(id, { status, ...(status === "ANSWERED" ? { response: (resp[id] ?? "").trim() || undefined } : {}) }); await q.reload(); } catch (e) { setErr(errorText(e)); } }
  return (
    <>
      <PageTitle title="درخواست‌های شبکه خدمات" sub="درخواست سالن‌ها از شرکای پلتفرم؛ پیگیری و پاسخ" />
      <div className="mb-4 flex gap-2">{([[undefined, "همه"], ["SUBMITTED", "ثبت‌شده"], ["REVIEWING", "در حال بررسی"], ["ANSWERED", "پاسخ داده‌شده"]] as const).map(([k, l]) => <Chip key={l} active={f === k} onClick={() => setF(k)}>{l}</Chip>)}</div>
      {err && <ErrorNote message={err} />}
      <Card className="p-5">
        <CardHead title="صف درخواست‌ها" />
        {q.loading && !q.data ? <Spinner /> : !q.data?.length ? <p className="text-sm text-ink3">درخواستی نیست.</p> : (
          <ul className="divide-y divide-line">
            {q.data.map((r) => (
              <li key={r.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><b>{r.salon}</b><span className="text-xs text-ink3">{r.city}</span><Badge>{r.category}</Badge><Badge tone={ST[r.status].t}>{ST[r.status].l}</Badge><span className="mr-auto text-xs text-ink3">{faDate.short(r.createdAt.slice(0, 10))}</span></div>
                {r.note && <p className="text-ink2">{r.note}</p>}
                {r.response && <p className="rounded-xl bg-sagesoft p-3 text-sage">{r.response}</p>}
                {r.status !== "ANSWERED" && (
                  <div className="flex flex-wrap items-center gap-2">
                    {r.status === "SUBMITTED" && <Button variant="soft" onClick={() => act(r.id, "REVIEWING")}>شروع بررسی</Button>}
                    <input value={resp[r.id] ?? ""} onChange={(e) => setResp({ ...resp, [r.id]: e.target.value })} placeholder="پاسخ برای سالن…" className={`${fieldCls} !min-h-9 flex-1`} />
                    <Button onClick={() => act(r.id, "ANSWERED")}>ثبت پاسخ</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminNetwork() { return <AdminGate><Queue /></AdminGate>; }
