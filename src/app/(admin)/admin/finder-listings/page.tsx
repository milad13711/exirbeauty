"use client";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Stat, fieldCls } from "@/components/ui";
import { catStyle } from "@/lib/finder";
import { ApiError, PLAN_INFO, errorText, finderApi, type AdminListing, type ListingStatus } from "@/lib/finderApi";

const filters = [{ k: undefined, l: "همه" }, { k: "PENDING", l: "در انتظار" }, { k: "PUBLISHED", l: "منتشرشده" }, { k: "REJECTED", l: "رد شده" }] as const;
const statusLabel: Record<ListingStatus, string> = { PENDING: "در انتظار", PUBLISHED: "منتشرشده", REJECTED: "رد شده" };
const statusTone: Record<ListingStatus, "amber" | "sage" | "danger"> = { PENDING: "amber", PUBLISHED: "sage", REJECTED: "danger" };

/** The API uses a real session cookie, separate from the prototype's mock admin login. */
function ApiLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setErr("");
    try { await finderApi.login(email, password); onDone(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="mx-auto mt-10 max-w-sm p-6">
      <h2 className="font-extrabold text-ink">ورود به سرویس مدیریت</h2>
      <p className="mt-1 text-xs leading-6 text-ink3">برای مدیریت ثبت‌نام‌ها باید با حساب ادمین سرور وارد شوید.</p>
      <div className="mt-4 space-y-3">
        <Field label="ایمیل"><input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} autoComplete="username" /></Field>
        <Field label="رمز عبور"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" style={{ textAlign: "right" }} className={fieldCls} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && go()} /></Field>
        {err && <p role="alert" className="rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
        <Button className="w-full" onClick={go} disabled={busy || !email || !password}>ورود</Button>
      </div>
    </Card>
  );
}

export default function AdminFinderListings() {
  const [rows, setRows] = useState<AdminListing[] | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [f, setF] = useState<ListingStatus | undefined>("PENDING");
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() =>
    finderApi.adminList().then((r) => { setRows(r); setNeedLogin(false); }).catch((e) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setNeedLogin(true); else setErr(errorText(e));
    }), []);
  useEffect(() => { void load(); }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setErr("");
    try { await fn(); setReason(""); await load(); } catch (e) { setErr(errorText(e)); }
  }

  if (needLogin) return <><PageTitle title="ثبت‌نام‌های اکسیریاب" /><ApiLogin onDone={load} /></>;
  const all = rows ?? [];
  const pendingWork = (l: AdminListing) => l.status === "PENDING" || !!l.pendingEdit;
  const list = all.filter((l) => (f === undefined ? true : f === "PENDING" ? pendingWork(l) : l.status === f));
  const cur = list.find((l) => l.id === sel) ?? list[0] ?? null;

  return (
    <>
      <PageTitle title="ثبت‌نام‌های اکسیریاب" sub="متخصص‌ها و سالن‌هایی که خودشان روی نقشه ثبت‌نام کرده‌اند؛ پس از تأیید منتشر می‌شوند" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="در انتظار تأیید" value={String(all.filter(pendingWork).length)} tone="amber" />
        <Stat label="منتشرشده" value={String(all.filter((l) => l.status === "PUBLISHED").length)} tone="sage" />
        <Stat label="رد شده" value={String(all.filter((l) => l.status === "REJECTED").length)} tone="danger" />
        <Stat label="پلن سالن/هنرمند" value={String(all.filter((l) => l.plan !== "free").length)} tone="sky" />
      </div>
      <div className="my-5 flex flex-wrap gap-2" role="tablist">
        {filters.map((x) => <button key={x.l} role="tab" aria-selected={f === x.k} onClick={() => setF(x.k)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", f === x.k ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{x.l}</button>)}
      </div>
      {err && <p role="alert" className="mb-4 rounded-xl bg-dangersoft p-3 text-sm text-danger">{err}</p>}
      {rows === null ? <p className="text-sm text-ink3">در حال بارگذاری…</p> : (
        <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
          <Card>
            <ul className="divide-y divide-line">
              {list.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setSel(l.id)} className={clsx("flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-right", cur?.id === l.id ? "bg-rosesoft" : "hover:bg-surface2")}>
                    <span className="min-w-0 flex-1"><b className="block truncate text-sm">{l.plan === "salon" ? l.brand : l.name}</b><span className="text-xs text-ink3">{PLAN_INFO[l.plan].title} · {l.city}</span></span>
                    {l.pendingEdit && <Badge tone="amber">ویرایش</Badge>}
                    <Badge tone={statusTone[l.status]}>{statusLabel[l.status]}</Badge>
                  </button>
                </li>
              ))}
              {!list.length && <li className="px-5 py-10 text-center text-sm text-ink3">موردی با این فیلتر نیست.</li>}
            </ul>
          </Card>

          {cur ? (
            <Card>
              <CardHead title={cur.plan === "salon" ? cur.brand : cur.name} hint={`${cur.id} · ثبت ${new Date(cur.updatedAt).toLocaleDateString("fa-IR")}`} action={<Badge tone="sky">{PLAN_INFO[cur.plan].title}</Badge>} />
              <div className="space-y-4 px-5 pb-5">
                <dl className="grid gap-2.5 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-ink3">نام مسئول</dt><dd className="font-semibold">{cur.name}</dd></div>
                  <div><dt className="text-xs text-ink3">موبایل</dt><dd><bdi dir="ltr">{cur.phone}</bdi></dd></div>
                  <div><dt className="text-xs text-ink3">شهر</dt><dd>{cur.city}</dd></div>
                  <div><dt className="text-xs text-ink3">نظرها / درخواست‌های نوبت</dt><dd>{cur.reviewCount} / {cur.leadCount}</dd></div>
                </dl>
                {cur.bio && <p className="rounded-xl bg-surface2 p-3 text-sm leading-6 text-ink2">{cur.bio}</p>}
                <div className="flex flex-wrap gap-1.5">{cur.cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}</div>
                {cur.staff.length > 0 && (
                  <ul className="space-y-1.5">
                    {cur.staff.map((s) => <li key={s.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><b>{s.name}</b><span className="flex gap-1">{s.cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}</span></li>)}
                  </ul>
                )}

                {cur.pendingEdit && (
                  <div className="rounded-xl border border-amber/40 bg-ambersoft p-3 text-sm">
                    <p className="mb-1.5 text-xs font-bold text-amber">ویرایش در انتظار تأیید</p>
                    <p><b>{cur.pendingEdit.name}</b> · {cur.pendingEdit.city} · <bdi dir="ltr">{cur.pendingEdit.phone}</bdi></p>
                    {cur.pendingEdit.bio && <p className="mt-1 text-xs leading-6 text-ink2">{cur.pendingEdit.bio}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">{cur.pendingEdit.cats.map((c) => <Badge key={c} className={clsx(catStyle[c].bg, catStyle[c].fg)}>{c}</Badge>)}</div>
                  </div>
                )}

                {(cur.status === "PENDING" || cur.pendingEdit) && (
                  <div className="space-y-2.5 border-t border-line pt-4">
                    <button onClick={() => act(() => finderApi.approve(cur.id))} className="press flex w-full items-center justify-center gap-1.5 rounded-[14px] bg-[image:var(--grad-rose)] py-2.5 text-[13.5px] font-bold text-white"><Check size={15} />{cur.pendingEdit ? "تأیید ویرایش" : "تأیید و انتشار روی نقشه"}</button>
                    <div className="flex gap-2">
                      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل رد (اختیاری)" className={fieldCls} />
                      <button onClick={() => act(() => finderApi.reject(cur.id, reason))} className="press flex shrink-0 items-center gap-1.5 rounded-[14px] border border-line px-4 text-[13px] font-bold text-danger hover:bg-dangersoft"><X size={15} />{cur.pendingEdit ? "رد ویرایش" : "رد کردن"}</button>
                    </div>
                  </div>
                )}
                {cur.status === "PUBLISHED" && !cur.pendingEdit && (
                  <button onClick={() => act(() => finderApi.unpublish(cur.id, reason))} className="press flex items-center gap-1.5 rounded-[14px] border border-line px-4 py-2.5 text-[13px] font-bold text-danger hover:bg-dangersoft"><X size={15} />لغو انتشار</button>
                )}
                {cur.status === "REJECTED" && cur.rejectReason && <p className="rounded-xl bg-dangersoft p-3 text-xs text-danger">دلیل رد: {cur.rejectReason}</p>}
              </div>
            </Card>
          ) : <Card className="grid place-items-center p-10 text-sm text-ink3">موردی انتخاب نشده است.</Card>}
        </div>
      )}
    </>
  );
}
