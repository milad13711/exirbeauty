"use client";
import { useState } from "react";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { Badge, Card, CardHead, PageTitle, Stat, fieldCls } from "@/components/ui";
import { catStyle } from "@/lib/finder";
import { finderListings, PLAN_INFO, useFinderListings, type FinderListing } from "@/lib/finderListings";

const filters = ["همه", "در انتظار", "منتشرشده", "رد شده"] as const;
const statusMap: Record<FinderListing["status"], (typeof filters)[number]> = { pending: "در انتظار", published: "منتشرشده", rejected: "رد شده" };
const statusTone: Record<FinderListing["status"], "amber" | "sage" | "danger"> = { pending: "amber", published: "sage", rejected: "danger" };

export default function AdminFinderListings() {
  const listings = useFinderListings();
  const [f, setF] = useState<(typeof filters)[number]>("در انتظار");
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const list = listings.filter((l) => f === "همه" || statusMap[l.status] === f).sort((a, b) => b.createdAt - a.createdAt);
  const cur = list.find((l) => l.id === sel) ?? list[0] ?? null;

  function approve(id: string) { finderListings.setStatus(id, "published"); }
  function reject(id: string) { finderListings.setStatus(id, "rejected", reason.trim() || "بدون دلیل ثبت‌شده"); setReason(""); }

  return (
    <>
      <PageTitle title="ثبت‌نام‌های اکسیریاب" sub="متخصص‌ها و سالن‌هایی که خودشان روی نقشه ثبت‌نام کرده‌اند؛ پس از تأیید منتشر می‌شوند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="در انتظار تأیید" value={String(listings.filter((l) => l.status === "pending").length)} tone="amber" />
        <Stat label="منتشرشده" value={String(listings.filter((l) => l.status === "published").length)} tone="sage" />
        <Stat label="رد شده" value={String(listings.filter((l) => l.status === "rejected").length)} tone="danger" />
        <Stat label="پلن سالن/هنرمند" value={String(listings.filter((l) => l.plan !== "free").length)} tone="sky" />
      </div>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f === x ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{x}</button>)}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        <Card>
          <ul className="divide-y divide-line">
            {list.map((l) => (
              <li key={l.id}>
                <button onClick={() => setSel(l.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right", (cur?.id ?? list[0]?.id) === l.id ? "bg-rosesoft" : "hover:bg-surface2")}>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm">{l.plan === "salon" ? l.brand : l.name}</b><span className="text-xs text-ink3">{PLAN_INFO[l.plan].title} · {l.city}</span></span>
                  <Badge tone={statusTone[l.status]}>{statusMap[l.status]}</Badge>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-5 py-10 text-center text-sm text-ink3">موردی با این فیلتر نیست.</li>}
          </ul>
        </Card>

        {cur ? (
          <Card>
            <CardHead title={cur.plan === "salon" ? cur.brand : cur.name} hint={`${cur.id} · ثبت‌نام ${new Date(cur.createdAt).toLocaleDateString("fa-IR")}`} action={<Badge tone="sky">{PLAN_INFO[cur.plan].title}</Badge>} />
            <div className="space-y-4 px-5 pb-5">
              <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-ink3">نام مسئول</dt><dd className="font-semibold">{cur.name}</dd></div>
                <div><dt className="text-xs text-ink3">موبایل</dt><dd><bdi dir="ltr">{cur.phone}</bdi></dd></div>
                <div><dt className="text-xs text-ink3">شهر</dt><dd>{cur.city}</dd></div>
                <div><dt className="text-xs text-ink3">مختصات روی نقشه</dt><dd className="font-mono text-xs">x:{cur.x.toFixed(1)} y:{cur.y.toFixed(1)}</dd></div>
              </dl>
              {cur.bio && <p className="rounded-xl bg-surface2 p-3 text-sm leading-6 text-ink2">{cur.bio}</p>}
              <div className="flex flex-wrap gap-1.5">
                {cur.cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}
              </div>
              {cur.plan === "salon" && (
                <div>
                  <p className="mb-2 text-xs font-bold text-ink2">متخصص‌های سالن ({cur.staff.length} نفر)</p>
                  <ul className="space-y-1.5">
                    {cur.staff.map((s, i) => <li key={i} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><b>{s.name}</b><span className="flex gap-1">{s.cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}</span></li>)}
                  </ul>
                </div>
              )}
              {cur.leads.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold text-ink2">درخواست‌های نوبت دریافتی ({cur.leads.length})</p>
                  <ul className="space-y-1.5 text-sm">
                    {cur.leads.slice(0, 5).map((ld, i) => <li key={i} className="rounded-lg bg-surface2 px-3 py-2"><b>{ld.name}</b> <bdi dir="ltr" className="text-xs text-ink3">{ld.phone}</bdi>{ld.note && <p className="mt-0.5 text-xs text-ink3">{ld.note}</p>}</li>)}
                  </ul>
                </div>
              )}

              {cur.status === "pending" && (
                <div className="space-y-2.5 border-t border-line pt-4">
                  <button onClick={() => approve(cur.id)} className="press flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-[image:var(--grad-rose)] py-2.5 text-[13.5px] font-bold text-white"><Check size={15} />تأیید و انتشار روی نقشه</button>
                  <div className="flex gap-2">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد (اختیاری)" className={fieldCls} />
                    <button onClick={() => reject(cur.id)} className="press flex shrink-0 items-center gap-1.5 rounded-[14px] border border-line px-4 text-[13px] font-bold text-danger hover:bg-dangersoft"><X size={15} />رد کردن</button>
                  </div>
                </div>
              )}
              {cur.status === "published" && (
                <button onClick={() => reject(cur.id)} className="press flex items-center gap-1.5 rounded-[14px] border border-line px-4 py-2.5 text-[13px] font-bold text-danger hover:bg-dangersoft"><X size={15} />لغو انتشار</button>
              )}
              {cur.status === "rejected" && cur.rejectReason && <p className="rounded-xl bg-dangersoft p-3 text-xs text-danger">دلیل رد: {cur.rejectReason}</p>}
            </div>
          </Card>
        ) : <Card className="grid place-items-center p-10 text-sm text-ink3">موردی انتخاب نشده است.</Card>}
      </div>
    </>
  );
}
