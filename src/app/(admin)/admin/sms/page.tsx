"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, CardHead, Field, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faNum, toman } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

const n = (s: string) => Math.max(0, Math.round(Number(s) || 0));

function Board() {
  const q = useQuery(crm.adminSms, []);
  const [sell, setSell] = useState(""); const [np, setNp] = useState({ name: "", price: "", bonus: "0" });
  const [adj, setAdj] = useState({ tenantId: "", delta: "", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  async function run(fn: () => Promise<unknown>, ok: string) { setMsg(null); try { await fn(); setMsg({ ok: true, t: ok }); await q.reload(); } catch (e) { setMsg({ ok: false, t: errorText(e) }); } }
  if (q.loading && !q.data) return <Spinner />;
  if (!q.data) return <ErrorNote message={errorText(q.error)} onRetry={q.reload} />;
  return (
    <>
      <PageTitle title="پیامک و درآمد" sub="قیمت هر پیامک، بسته‌های شارژ و اصلاح دستی اعتبار سالن‌ها" />
      {msg && <p role="status" className={`mb-4 rounded-xl p-3 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-3 p-5">
          <CardHead title="قیمت فروش هر پیامک" hint="برای هر ۷۰ کاراکتر؛ از پیام‌های بعدی اعمال می‌شود" />
          <p className="text-sm">قیمت فعلی: <b>{toman(q.data.pricing.sell)}</b></p>
          <div className="flex gap-2"><input dir="ltr" inputMode="numeric" className={fieldCls} value={sell} onChange={(e) => setSell(e.target.value)} placeholder="قیمت جدید (تومان)" /><Button disabled={!n(sell)} onClick={() => run(() => crm.adminSmsPricing(n(sell)), "قیمت به‌روز شد.")}>ثبت</Button></div>
        </Card>
        <Card className="space-y-3 p-5">
          <CardHead title="اصلاح اعتبار یک سالن" hint="مثبت = افزایش، منفی = کسر؛ ثبت و در گزارش ممیزی نگه‌داری می‌شود" />
          <Field label="شناسه‌ی سالن"><input dir="ltr" className={fieldCls} value={adj.tenantId} onChange={(e) => setAdj({ ...adj, tenantId: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="مقدار (تومان)"><input dir="ltr" className={fieldCls} value={adj.delta} onChange={(e) => setAdj({ ...adj, delta: e.target.value })} /></Field><Field label="دلیل"><input className={fieldCls} value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} /></Field></div>
          <Button disabled={!adj.tenantId || !Number(adj.delta) || !adj.note.trim()} onClick={() => run(() => crm.adminSmsAdjust({ tenantId: adj.tenantId.trim(), delta: Math.round(Number(adj.delta)), note: adj.note.trim() }), "اعتبار اصلاح شد.")}>اعمال</Button>
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <CardHead title="بسته‌های شارژ" />
        <ul className="divide-y divide-line text-sm">
          {q.data.packages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1"><b>{p.name}</b><span className="block text-xs text-ink3">{toman(p.price)} · {faNum(p.bonusPct)}٪ هدیه</span></span>
              {!p.active && <Badge>غیرفعال</Badge>}
              <Toggle on={p.active} label={`فعال بودن ${p.name}`} onChange={(v) => run(() => crm.adminSmsPackageUpdate(p.id, { active: v }), "بسته به‌روز شد.")} />
            </li>
          ))}
        </ul>
        <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-4">
          <input className={fieldCls} placeholder="نام بسته" value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} />
          <input dir="ltr" className={fieldCls} placeholder="قیمت (تومان)" value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} />
          <input dir="ltr" className={fieldCls} placeholder="درصد هدیه" value={np.bonus} onChange={(e) => setNp({ ...np, bonus: e.target.value })} />
          <Button disabled={np.name.trim().length < 1 || n(np.price) < 10_000} onClick={() => run(async () => { await crm.adminSmsPackage({ name: np.name.trim(), price: n(np.price), bonusPct: Math.min(100, n(np.bonus)) }); setNp({ name: "", price: "", bonus: "0" }); }, "بسته اضافه شد.")}><Plus size={14} />افزودن</Button>
        </div>
      </Card>
    </>
  );
}

export default function AdminSms() { return <AdminGate><Board /></AdminGate>; }
