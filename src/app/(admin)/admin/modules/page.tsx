"use client";
import { useState } from "react";
import { Badge, Card, CardHead, PageTitle, Toggle, fieldCls } from "@/components/ui";
import { AdminGate } from "@/components/live/AdminGate";
import { ErrorNote, Modal, Spinner } from "@/components/live/ui";
import { errorText } from "@/lib/api";
import { crm } from "@/lib/crmApi";
import { faDate, faNum } from "@/lib/fmt";
import { useQuery } from "@/lib/useQuery";

function Versions({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const q = useQuery(() => crm.adminModuleVersions(id), [id]);
  return (
    <Modal title={`تاریخچه‌ی نسخه‌ها — ${name}`} onClose={onClose}>
      {q.loading && !q.data ? <Spinner /> : (
        <ul className="divide-y divide-line text-sm">
          {q.data?.map((v) => <li key={v.version} className="py-2"><b dir="ltr">{v.version}</b><span className="mr-2 text-xs text-ink3">{faDate.short(v.releasedAt.slice(0, 10))}</span><p className="text-ink2">{v.changelog}</p></li>)}
        </ul>
      )}
    </Modal>
  );
}

function Board() {
  const mods = useQuery(crm.adminModules, []);
  const plans = useQuery(crm.plans, []);
  const [err, setErr] = useState(""); const [ver, setVer] = useState<{ id: string; name: string } | null>(null);
  async function run(fn: () => Promise<unknown>) { setErr(""); try { await fn(); await Promise.all([mods.reload(), plans.reload()]); } catch (e) { setErr(errorText(e)); } }
  if ((mods.loading && !mods.data) || (plans.loading && !plans.data)) return <Spinner />;
  if (!mods.data || !plans.data) return <ErrorNote message={errorText(mods.error ?? plans.error)} onRetry={() => { void mods.reload(); void plans.reload(); }} />;
  const modules = mods.data, planList = plans.data;
  const cats = [...new Set(modules.map((m) => m.category))];
  return (
    <>
      <PageTitle title="ماژول‌ها و دسترسی پلن‌ها" sub="کدام ماژول در کدام پلن باشد، قیمت خرید تکی و کلید خاموش/روشن سراسری" />
      {err && <ErrorNote message={err} />}
      {cats.map((cat) => (
        <Card key={cat} className="mb-5 p-5">
          <CardHead title={cat} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-right text-xs text-ink3"><th className="pb-2">ماژول</th><th>نسخه</th>{planList.map((p) => <th key={p.code} className="px-2 text-center">{p.title}</th>)}<th className="px-2">قیمت تکی</th><th className="px-2">سراسری</th><th className="px-2">سالن‌ها</th></tr></thead>
              <tbody className="divide-y divide-line">
                {modules.filter((m) => m.category === cat).map((m) => (
                  <tr key={m.id}>
                    <td className="py-2"><b>{m.name}</b>{m.core && <Badge tone="sage" className="mr-2">هسته</Badge>}</td>
                    <td><button onClick={() => setVer({ id: m.id, name: m.name })} className="cursor-pointer font-mono text-xs text-rose underline" dir="ltr">{m.version}</button></td>
                    {planList.map((p) => {
                      const on = m.planCodes.includes(p.code);
                      return <td key={p.code} className="px-2 text-center"><input type="checkbox" aria-label={`${m.name} در ${p.title}`} checked={on} disabled={m.core} onChange={() => run(() => crm.adminSetPlanModules(p.code, on ? p.moduleIds.filter((x) => x !== m.id) : [...p.moduleIds, m.id]))} className="size-4 cursor-pointer accent-[#b4536f]" /></td>;
                    })}
                    <td className="px-2"><input type="number" min={0} step={10000} defaultValue={m.price} aria-label={`قیمت ${m.name}`} onBlur={(e) => { const v = Math.max(0, Math.round(+e.target.value || 0)); if (v !== m.price) void run(() => crm.adminEditModule(m.id, { price: v })); }} className={`${fieldCls} !min-h-9 !w-28 !py-1 text-center`} /></td>
                    <td className="px-2"><Toggle on={m.enabled} label={`فعال بودن ${m.name}`} onChange={(v) => run(() => crm.adminEditModule(m.id, { enabled: v }))} /></td>
                    <td className="px-2 text-center text-xs text-ink2">{faNum(m.tenantCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      {ver && <Versions id={ver.id} name={ver.name} onClose={() => setVer(null)} />}
    </>
  );
}

export default function AdminModules() { return <AdminGate><Board /></AdminGate>; }
