"use client";
import { useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type ContentPostRow, type PostKind } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { caption, tipTopics } from "@/lib/caption";
import { renderStory } from "@/lib/story";
import { addDays, faDate, faNum, todayLocal } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const KINDS: { k: Exclude<PostKind, "BEFORE_AFTER">; l: string; gen: "service" | "offer" | "birthday" | "tips" }[] = [
  { k: "SERVICE", l: "معرفی خدمت", gen: "service" }, { k: "OFFER", l: "پیشنهاد ویژه", gen: "offer" }, { k: "BIRTHDAY", l: "تولد مشتریان", gen: "birthday" }, { k: "TIPS", l: "نکته‌ی آموزشی", gen: "tips" },
];
const STATUS: Record<ContentPostRow["status"], { l: string; t: Tone }> = { DRAFT: { l: "پیش‌نویس", t: "neutral" }, SCHEDULED: { l: "زمان‌بندی‌شده", t: "sky" }, PUBLISHED: { l: "منتشر شد", t: "sage" } };
const monthName = () => new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long" }).format(new Date());

function Board() {
  const ctx = useQuery(crm.contentContext, []);
  const posts = useQuery(crm.contentPosts, []);
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("SERVICE");
  const [svcId, setSvcId] = useState(""); const [discount, setDiscount] = useState(10); const [until, setUntil] = useState(5);
  const [topic, setTopic] = useState(Object.keys(tipTopics)[0]); const [variant, setVariant] = useState(0);
  const [text, setText] = useState<string | null>(null); const [when, setWhen] = useState(1); const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  if ((ctx.loading && !ctx.data) || (posts.loading && !posts.data)) return <Spinner />;
  if (!ctx.data || !posts.data) return <ErrorNote message={errorText(ctx.error ?? posts.error)} onRetry={() => { void ctx.reload(); void posts.reload(); }} />;
  const c = ctx.data;
  const svc = c.services.find((s) => s.id === svcId) ?? c.services[0];
  const k = KINDS.find((x) => x.k === kind)!;
  const gen = caption(k.gen, { service: svc?.name, discount, until: faDate.short(addDays(todayLocal(), until)), topic: kind === "BIRTHDAY" ? monthName() : topic, salon: c.salon, price: svc ? `${faNum((svc.price / 1000).toLocaleString("en-US"))} هزار` : undefined }, variant);
  const cap = text ?? gen.text;
  const reset = () => { setText(null); setEditId(null); setVariant(0); };

  async function save(status: ContentPostRow["status"], note: string) {
    setMsg(null); setBusy(true);
    try {
      const scheduledFor = status === "SCHEDULED" ? addDays(todayLocal(), when) : null;
      if (editId) await crm.updatePost(editId, { caption: cap, tags: gen.tags, status, scheduledFor }); else await crm.createPost({ kind, caption: cap, tags: gen.tags, service: kind === "SERVICE" || kind === "OFFER" ? svc?.name ?? null : null, status, scheduledFor });
      setMsg({ ok: true, t: note }); reset(); await posts.reload();
    } catch (e) { setMsg({ ok: false, t: errorText(e) }); } finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setMsg(null);
    try { const b = await renderStory({ salon: c.salon, caption: cap.replace(/\n/g, " "), tags: gen.tags, cta: "برای رزرو نوبت، لینک پروفایل", kind: k.gen }); const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = "story.png"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); setMsg({ ok: true, t: "کارت استوری دانلود شد." }); }
    catch { setMsg({ ok: false, t: "ساخت تصویر ممکن نشد." }); }
    setBusy(false);
  }
  async function act(fn: () => Promise<unknown>) { setMsg(null); try { await fn(); await posts.reload(); } catch (e) { setMsg({ ok: false, t: errorText(e) }); } }
  const load = (p: ContentPostRow) => { const kk = KINDS.find((x) => x.k === p.kind); if (kk) setKind(kk.k); setText(p.caption); setEditId(p.id); setMsg(null); };

  return (
    <div className="space-y-5">
      <PageTitle title="تولید محتوا" sub="کپشن و کارت استوری از داخل سیستم؛ تقویم انتشار شما" />
      {posts.data.due > 0 && <p className="rounded-xl bg-ambersoft p-3 text-sm text-amber">{faNum(posts.data.due)} پست زمان‌بندی‌شده موعدش رسیده؛ آن را در حساب خود منتشر کنید و «منتشر شد» بزنید.</p>}
      <div className="flex flex-wrap gap-2" role="tablist">{KINDS.map((x) => <Chip key={x.k} active={kind === x.k} onClick={() => { setKind(x.k); reset(); setMsg(null); }}>{x.l}</Chip>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-3 p-5">
          <CardHead title={editId ? "ویرایش پست" : "پست جدید"} />
          {(kind === "SERVICE" || kind === "OFFER") && (c.services.length ? <Field label="خدمت"><select value={svc?.id} onChange={(e) => { setSvcId(e.target.value); setText(null); }} className={fieldCls}>{c.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field> : <p className="rounded-xl bg-ambersoft p-3 text-sm text-amber">ابتدا در «منوی خدمات» خدمتی تعریف کنید.</p>)}
          {kind === "OFFER" && <div className="grid grid-cols-2 gap-3"><Field label="تخفیف (٪)"><input type="number" min={1} max={60} value={discount} onChange={(e) => { setDiscount(Math.min(60, Math.max(1, +e.target.value || 1))); setText(null); }} className={fieldCls} /></Field><Field label="اعتبار تا"><select value={until} onChange={(e) => { setUntil(+e.target.value); setText(null); }} className={fieldCls}>{[2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{faDate.weekday(addDays(todayLocal(), d))} {faDate.short(addDays(todayLocal(), d))}</option>)}</select></Field></div>}
          {kind === "TIPS" && <Field label="موضوع"><select value={topic} onChange={(e) => { setTopic(e.target.value); setText(null); }} className={fieldCls}>{Object.keys(tipTopics).map((t) => <option key={t}>{t}</option>)}</select></Field>}
          {kind === "BIRTHDAY" && <p className="rounded-xl bg-surface2 p-3 text-sm text-ink2">{faNum(c.birthdaysThisMonth)} مشتری شما در این ماه ({monthName()}) تولد دارند. متن عمومی است و نام کسی ذکر نمی‌شود.</p>}
          <Field label="کپشن"><textarea rows={5} maxLength={2200} value={cap} onChange={(e) => setText(e.target.value)} className={`${fieldCls} leading-7`} /></Field>
          <p className="text-xs text-ink3">{gen.tags.join(" ")}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => { setVariant(variant + 1); setText(null); }}><RefreshCw size={14} />کپشن دیگر</Button>
            <Button variant="ghost" onClick={download} disabled={busy}><Download size={14} />{busy ? "در حال ساخت…" : "دانلود کارت استوری"}</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <Button variant="soft" disabled={busy} onClick={() => save("DRAFT", "به‌عنوان پیش‌نویس ذخیره شد.")}>ذخیره‌ی پیش‌نویس</Button>
            <Field label="زمان‌بندی"><select value={when} onChange={(e) => setWhen(+e.target.value)} className={`${fieldCls} !w-auto !py-2`}>{[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{faDate.weekday(addDays(todayLocal(), d))} {faDate.short(addDays(todayLocal(), d))}</option>)}</select></Field>
            <Button variant="ghost" disabled={busy} onClick={() => save("SCHEDULED", "پست زمان‌بندی شد.")}>زمان‌بندی</Button>
            <Button disabled={busy} onClick={() => save("PUBLISHED", "پست به‌عنوان منتشرشده ثبت شد.")}>ثبت به‌عنوان منتشرشده</Button>
          </div>
          <p className="text-xs text-ink3">انتشار روی اینستاگرام یا تلگرام را خودتان انجام می‌دهید؛ اینجا فقط تقویم و متن‌ها نگه‌داری می‌شود.</p>
          {msg && <p role="status" className={`rounded-xl p-2.5 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
        </Card>
        <Card className="p-5 lg:sticky lg:top-20">
          <CardHead title="پیش‌نمایش استوری" />
          <div className="relative mx-auto flex aspect-[9/16] max-w-[240px] flex-col overflow-hidden rounded-3xl p-4" style={{ background: "linear-gradient(150deg,#f7e4ea,#f6ecd6)" }}>
            <p className="text-[11px] font-extrabold text-rosedeep">{c.salon}</p>
            <p className="mt-6 line-clamp-[10] whitespace-pre-line text-[11px] leading-5 text-ink">{cap}</p>
            <p className="mt-auto rounded-full bg-plum py-1.5 text-center text-[10px] font-bold text-white">برای رزرو نوبت، لینک پروفایل</p>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <CardHead title="تقویم محتوا" hint={`${faNum(posts.data.posts.length)} پست`} />
        {!posts.data.posts.length ? <p className="text-sm text-ink3">هنوز پستی ساخته نشده است.</p> : (
          <ul className="divide-y divide-line">
            {posts.data.posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm">
                <span className="min-w-0 flex-1 basis-56"><b className="block truncate">{p.caption.split("\n")[0]}</b><span className="text-xs text-ink3">{KINDS.find((x) => x.k === p.kind)?.l ?? "قبل/بعد"}{p.scheduledFor ? ` · ${faDate.short(p.scheduledFor)}` : ""}</span></span>
                <Badge tone={STATUS[p.status].t}>{STATUS[p.status].l}</Badge>
                {p.status !== "PUBLISHED" && <Button variant="ghost" onClick={() => act(() => crm.updatePost(p.id, { status: "PUBLISHED" }))}>منتشر شد</Button>}
                <Button variant="ghost" onClick={() => load(p)}>ویرایش</Button>
                <button aria-label="حذف پست" onClick={() => act(() => crm.deletePost(p.id))} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export function LiveContent() { return <LiveGate><Board /></LiveGate>; }
