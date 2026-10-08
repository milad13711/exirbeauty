"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls, type Tone } from "@/components/ui";
import { LiveGate, canManage, useMe } from "./LiveGate";
import { Chip, ErrorNote, Spinner } from "./ui";
import { crm, type CalSettings, type TenantProfile } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { DAY_NAMES, faDate, faNum, parseTime, timeValue, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";
import { DEFAULT_COLOR, isHex, presets } from "@/lib/theme";
import { setLiveBrand } from "@/lib/liveBrand";

const TABS = [["profile", "پروفایل سالن"], ["me", "پروفایل من"], ["brand", "برند و ظاهر"], ["hours", "ساعت کاری"], ["online", "رزرو آنلاین"], ["notify", "اعلان‌ها"], ["users", "کاربران"], ["plan", "اشتراک و پلن"]] as const;
type Tab = (typeof TABS)[number][0];
const STATUS: Record<string, { label: string; tone: Tone }> = { ACTIVE: { label: "فعال", tone: "sage" }, TRIAL: { label: "آزمایشی", tone: "sky" }, EXPIRED: { label: "منقضی", tone: "danger" }, CANCELED: { label: "لغوشده", tone: "danger" } };

function Saved({ on }: { on: boolean }) { return on ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sage"><Check size={14} />ذخیره شد</span> : null; }

function Profile({ t, canEdit, onSaved }: { t: TenantProfile; canEdit: boolean; onSaved: () => void }) {
  const [name, setName] = useState(t.name); const [city, setCity] = useState(t.city);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); setOk(false); setBusy(true);
    try { await crm.patchTenant({ name: name.trim(), city: city.trim() }); setOk(true); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="max-w-xl space-y-3 p-5">
      <CardHead title="مشخصات سالن" />
      <Field label="نام سالن"><input className={fieldCls} value={name} disabled={!canEdit} onChange={(e) => { setName(e.target.value); setOk(false); }} /></Field>
      <Field label="شهر"><input className={fieldCls} value={city} disabled={!canEdit} onChange={(e) => { setCity(e.target.value); setOk(false); }} /></Field>
      <Field label="نشانی صفحه‌ی رزرو"><input dir="ltr" readOnly className={fieldCls} value={`/s/${t.slug}`} /></Field>
      {err && <ErrorNote message={err} />}
      {canEdit && <div className="flex items-center gap-3"><Button disabled={busy || name.trim().length < 2} onClick={save}>ذخیره</Button><Saved on={ok} /></div>}
    </Card>
  );
}

function Hours({ s, canEdit, onSaved }: { s: CalSettings; canEdit: boolean; onSaved: () => void }) {
  const [hours, setHours] = useState(s.hours);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const set = (i: number, p: Partial<(typeof hours)[number]>) => { setHours((h) => h.map((x, j) => (j === i ? { ...x, ...p } : x))); setOk(false); };
  async function save() {
    setErr(""); setOk(false);
    if (!hours.some((h) => h.open)) return setErr("حداقل یک روز باید باز باشد.");
    if (hours.some((h) => h.open && h.start >= h.end)) return setErr("ساعت پایان باید بعد از شروع باشد.");
    setBusy(true);
    try { await crm.saveCalSettings({ hours }); setOk(true); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="max-w-3xl p-5">
      <CardHead title="ساعت کاری سالن" hint="روزهای تعطیل در تقویم و رزرو آنلاین بسته می‌شوند" />
      <ul className="space-y-2">
        {hours.map((h, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line px-4 py-2.5">
            <Toggle on={h.open} label={`باز بودن ${DAY_NAMES[i]}`} onChange={(v) => canEdit && set(i, { open: v })} />
            <b className="w-20 text-sm">{DAY_NAMES[i]}</b>
            {h.open ? (
              <span className="flex items-center gap-2 text-sm">
                از <input type="time" dir="ltr" disabled={!canEdit} value={timeValue(h.start)} onChange={(e) => { const m = parseTime(e.target.value); if (m !== null) set(i, { start: m }); }} className={`${fieldCls} !w-auto !py-1.5`} />
                تا <input type="time" dir="ltr" disabled={!canEdit} value={timeValue(h.end)} onChange={(e) => { const m = parseTime(e.target.value); if (m !== null) set(i, { end: m }); }} className={`${fieldCls} !w-auto !py-1.5`} />
              </span>
            ) : <span className="text-sm text-ink3">تعطیل</span>}
          </li>
        ))}
      </ul>
      {err && <div className="mt-3"><ErrorNote message={err} /></div>}
      {canEdit && <div className="mt-4 flex items-center gap-3"><Button disabled={busy} onClick={save}>ذخیره</Button><Saved on={ok} /></div>}
    </Card>
  );
}

function Online({ s, canEdit, onSaved }: { s: CalSettings; canEdit: boolean; onSaved: () => void }) {
  const [v, setV] = useState(s);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  const set = (p: Partial<CalSettings>) => { setV((x) => ({ ...x, ...p })); setOk(false); };
  async function save() {
    setErr(""); setOk(false); setBusy(true);
    try { await crm.saveCalSettings({ onlineEnabled: v.onlineEnabled, autoConfirm: v.autoConfirm, leadHours: v.leadHours, cancelHours: v.cancelHours, stepMin: v.stepMin }); setOk(true); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="max-w-3xl space-y-4 p-5">
      <CardHead title="رزرو آنلاین" hint="قوانین فرم عمومی رزرو" />
      {([["onlineEnabled", "رزرو آنلاین فعال باشد", "با غیرفعال‌سازی، صفحه‌ی عمومی رزرو بسته می‌شود"], ["autoConfirm", "تأیید خودکار نوبت‌ها", "نوبت‌های آنلاین بدون بررسی شما «تأییدشده» ثبت می‌شوند"]] as const).map(([k, l, h]) => (
        <div key={k} className="flex items-start gap-3"><Toggle on={v[k]} label={l} onChange={(x) => canEdit && set({ [k]: x })} /><div><p className="text-sm font-semibold">{l}</p><p className="text-xs text-ink3">{h}</p></div></div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="حداقل فاصله تا نوبت (ساعت)"><input type="number" min={0} max={168} disabled={!canEdit} value={v.leadHours} onChange={(e) => set({ leadHours: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>
        <Field label="مهلت لغو رایگان (ساعت)"><input type="number" min={0} max={168} disabled={!canEdit} value={v.cancelHours} onChange={(e) => set({ cancelHours: Math.max(0, +e.target.value || 0) })} className={fieldCls} /></Field>
        <Field label="فاصله‌ی زمان‌های رزرو (دقیقه)"><select disabled={!canEdit} value={v.stepMin} onChange={(e) => set({ stepMin: +e.target.value })} className={fieldCls}>{[10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{faNum(m)}</option>)}</select></Field>
      </div>
      <p className="text-xs text-ink3">پیام‌های خودکار (تأیید، یادآوری، تولد…) از بخش «پیامک» تنظیم می‌شوند.</p>
      {err && <ErrorNote message={err} />}
      {canEdit && <div className="flex items-center gap-3"><Button disabled={busy} onClick={save}>ذخیره</Button><Saved on={ok} /></div>}
    </Card>
  );
}

function MyProfile() {
  const me = useMe();
  const [name, setName] = useState(me.name); const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  async function save() { setErr(""); setOk(false); setBusy(true); try { await crm.patchMe(name.trim()); setOk(true); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); } }
  return (
    <Card className="max-w-xl space-y-3 p-5">
      <CardHead title="پروفایل من" hint="ورود با کد پیامکی به شماره‌ی موبایل شما انجام می‌شود" />
      <Field label="نام و نام خانوادگی"><input className={fieldCls} value={name} onChange={(e) => { setName(e.target.value); setOk(false); }} /></Field>
      {err && <ErrorNote message={err} />}
      <div className="flex items-center gap-3"><Button disabled={busy || name.trim().length < 2} onClick={save}>ذخیره</Button><Saved on={ok} /></div>
    </Card>
  );
}

function Brand({ t, canEdit, onSaved }: { t: TenantProfile; canEdit: boolean; onSaved: () => void }) {
  const [color, setColor] = useState(t.brandColor ?? DEFAULT_COLOR);
  const [err, setErr] = useState(""); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false);
  async function save(c: string | null) {
    setErr(""); setOk(false); setBusy(true);
    try { const r = await crm.patchTenant({ brandColor: c }); setLiveBrand(r.brandColor); setOk(true); onSaved(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="max-w-xl space-y-4 p-5">
      <CardHead title="رنگ برند" hint="رنگ دکمه‌ها و تأکیدها در پنل شما؛ بلافاصله اعمال می‌شود" />
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-9">
        {presets.map((p) => <button key={p.c} type="button" disabled={!canEdit} aria-label={p.n} title={p.n} onClick={() => { setColor(p.c); setOk(false); }} className="grid aspect-square cursor-pointer place-items-center rounded-2xl text-white shadow-[var(--shadow-card)]" style={{ background: p.c }}>{color.toLowerCase() === p.c && <Check size={18} />}</button>)}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" disabled={!canEdit} value={isHex(color) ? color : DEFAULT_COLOR} onChange={(e) => { setColor(e.target.value); setOk(false); }} aria-label="رنگ دلخواه" className="size-11 cursor-pointer rounded-2xl border border-line" />
        <input dir="ltr" disabled={!canEdit} value={color} maxLength={7} onChange={(e) => { setColor(e.target.value); setOk(false); }} aria-label="کد رنگ" className={`${fieldCls} max-w-36 text-left font-mono`} />
      </div>
      {err && <ErrorNote message={err} />}
      {canEdit && <div className="flex flex-wrap items-center gap-3"><Button disabled={busy || !isHex(color)} onClick={() => save(color.toLowerCase())}>ذخیره</Button><Button variant="ghost" disabled={busy} onClick={() => { setColor(DEFAULT_COLOR); void save(null); }}>بازگشت به رنگ پیش‌فرض</Button><Saved on={ok} /></div>}
    </Card>
  );
}

function Notify({ canEdit }: { canEdit: boolean }) {
  const q = useQuery(() => crm.smsScenarios().catch(() => null), []);
  const [err, setErr] = useState("");
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <Card className="p-6 text-sm text-ink2">ماژول پیامک برای این سالن فعال نیست.</Card>;
  async function flip(kind: string, enabled: boolean) { setErr(""); try { await crm.smsPutScenario(kind, { enabled }); await q.reload(); } catch (e) { setErr(errorText(e)); } }
  return (
    <Card className="max-w-3xl space-y-3 p-5">
      <CardHead title="پیامک‌های خودکار" hint="متن هر پیام را از صفحه‌ی «پیامک» ویرایش کنید" />
      {err && <ErrorNote message={err} />}
      {q.data.map((s) => <div key={s.kind} className="flex items-center gap-3"><Toggle on={s.enabled} label={s.title} onChange={(v) => canEdit && flip(s.kind, v)} /><span className="text-sm">{s.title}</span></div>)}
    </Card>
  );
}

function Users() {
  const me = useMe();
  const q = useQuery(crm.tenantUsers, []);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  async function toggle(id: string, active: boolean) {
    setErr(""); setBusy(id);
    try { await crm.setUserActive(id, active); await q.reload(); } catch (e) { setErr(errorText(e)); } finally { setBusy(""); }
  }
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  return (
    <Card className="max-w-3xl p-5">
      <CardHead title="کاربران سالن" hint="ورود با کد پیامکی؛ ورود پرسنل را از صفحه‌ی «پرسنل» تعریف کنید" />
      {err && <div className="mb-3"><ErrorNote message={err} /></div>}
      <ul className="divide-y divide-line">
        {q.data.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-0 flex-1"><b>{u.name}</b><span dir="ltr" className="mr-2 text-xs text-ink3">{u.phone}</span>{u.staff && <span className="block text-xs text-ink3">متخصص: {u.staff.name}</span>}</span>
            <Badge tone={u.role === "OWNER" ? "rose" : "neutral"}>{u.role === "OWNER" ? "مالک" : "پرسنل"}</Badge>
            {u.role === "STAFF" && u.id !== me.userId
              ? <Toggle on={u.active} label={`فعال بودن ${u.name}`} onChange={(v) => busy === "" && toggle(u.id, v)} />
              : <Badge tone="sage">فعال</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Plan({ t, canEdit }: { t: TenantProfile; canEdit: boolean }) {
  const plans = useQuery(crm.plans, []);
  const pays = useQuery(crm.payments, []);
  const [code, setCode] = useState(t.subscription?.planCode ?? "");
  const [months, setMonths] = useState(1);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const sub = t.subscription;
  const picked = plans.data?.find((p) => p.code === code);
  const total = (picked?.priceMonthly ?? 0) * months;
  async function pay() {
    setErr(""); setBusy(true);
    try { window.location.assign((await crm.payPlan(code, months)).paymentUrl); } catch (e) { setErr(errorText(e)); setBusy(false); }
  }
  return (
    <div className="max-w-3xl space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-ink3">پلن فعلی</p><h2 className="text-xl font-extrabold">{sub?.planTitle ?? "بدون اشتراک"}</h2>{sub && <p className="mt-1 text-sm text-ink2">{sub.priceMonthly ? `${toman(sub.priceMonthly)} در ماه` : "رایگان"}</p>}</div>
          {sub && <div className="text-left"><Badge tone={STATUS[sub.status]?.tone ?? "neutral"}>{STATUS[sub.status]?.label ?? sub.status}</Badge><p className="mt-1.5 text-xs text-ink2">{sub.expiresAt ? `پایان: ${faDate.full(sub.expiresAt.slice(0, 10))}` : "بدون تاریخ پایان"}</p></div>}
        </div>
      </Card>
      {canEdit && (
        <Card className="space-y-4 p-5">
          <CardHead title="تمدید یا تغییر پلن" hint="پرداخت امن با درگاه زرین‌پال" />
          {plans.loading && !plans.data ? <Spinner /> : (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {plans.data?.filter((p) => p.priceMonthly > 0).map((p) => (
                  <button key={p.code} onClick={() => setCode(p.code)} aria-pressed={code === p.code} className={`cursor-pointer rounded-xl border p-3 text-right ${code === p.code ? "border-rose bg-rosesoft ring-1 ring-rose" : "border-line hover:bg-surface2"}`}>
                    <b className="block text-sm">{p.title}</b><span className="text-xs text-ink2">{toman(p.priceMonthly)} / ماه</span><span className="mt-1 block text-[11px] text-ink3">{p.tagline}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">{[1, 3, 6, 12].map((m) => <Chip key={m} active={months === m} onClick={() => setMonths(m)}>{faNum(m)} ماه</Chip>)}</div>
              {picked && picked.priceMonthly > 0 && <p className="rounded-xl bg-surface2 p-3 text-sm">مبلغ قابل پرداخت: <b>{toman(total)}</b></p>}
              {err && <ErrorNote message={err} />}
              <Button disabled={busy || !picked || picked.priceMonthly <= 0} onClick={pay}>{busy ? "در حال انتقال…" : "پرداخت و فعال‌سازی"}</Button>
            </>
          )}
        </Card>
      )}
      {canEdit && pays.data && pays.data.length > 0 && (
        <Card className="p-5">
          <CardHead title="پرداخت‌های اخیر" />
          <ul className="divide-y divide-line text-sm">
            {pays.data.slice(0, 10).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1 text-ink2">{p.description}<span className="mr-2 text-xs text-ink3">{faDate.short(p.createdAt.slice(0, 10))}</span></span>
                <Badge tone={p.status === "PAID" ? "sage" : p.status === "PENDING" ? "amber" : "danger"}>{{ PAID: "موفق", PENDING: "در انتظار", FAILED: "ناموفق", CANCELED: "لغو" }[p.status]}</Badge>
                <b>{toman(p.amount)}</b>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Hub() {
  const me = useMe();
  const t = useQuery(crm.tenant, []);
  const cal = useQuery(() => crm.calSettings().catch(() => null), []);
  const [tab, setTab] = useState<Tab>(() => { const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null; return TABS.find(([k]) => k === q)?.[0] ?? "profile"; });
  const canEdit = canManage(me);
  if (t.loading && !t.data) return <Spinner />;
  if (!t.data) return <ErrorNote message={errorText(t.error)} onRetry={t.reload} />;
  return (
    <div className="space-y-4">
      <PageTitle title="تنظیمات سالن" sub="مشخصات، ساعت کاری، رزرو آنلاین و اشتراک" />
      <div className="flex flex-wrap gap-2" role="tablist">{TABS.map(([k, l]) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{l}</Chip>)}</div>
      {tab === "profile" && <Profile key={t.data.name + t.data.city} t={t.data} canEdit={canEdit} onSaved={t.reload} />}
      {(tab === "hours" || tab === "online") && (cal.loading && !cal.data ? <Spinner /> : !cal.data
        ? <Card className="p-6 text-sm text-ink2">تقویم و نوبت‌دهی برای این سالن در دسترس نیست.</Card>
        : tab === "hours" ? <Hours s={cal.data} canEdit={canEdit} onSaved={cal.reload} /> : <Online s={cal.data} canEdit={canEdit} onSaved={cal.reload} />)}
      {tab === "me" && <MyProfile />}
      {tab === "brand" && <Brand key={t.data.brandColor ?? "-"} t={t.data} canEdit={canEdit} onSaved={t.reload} />}
      {tab === "notify" && <Notify canEdit={canEdit} />}
      {tab === "users" && (canEdit ? <Users /> : <Card className="p-6 text-sm text-ink2">مدیریت کاربران فقط برای مالک سالن است.</Card>)}
      {tab === "plan" && <Plan t={t.data} canEdit={canEdit} />}
    </div>
  );
}

export function LiveSettings() { return <LiveGate><Hub /></LiveGate>; }
