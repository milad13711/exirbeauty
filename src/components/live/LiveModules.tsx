"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Lock } from "lucide-react";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import { canManage, useMe } from "./LiveGate";
import { ErrorNote } from "./ui";
import { crm, type ModuleEnt } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { useEntitlements } from "@/lib/entitlements";
import { faNum, toman } from "@/lib/fmt";
import { moduleById } from "@/lib/modules";

const href = (id: string) => moduleById(id)?.routes[0] ?? null;

function Row({ m, byId, manage }: { m: ModuleEnt; byId: (id: string) => ModuleEnt | undefined; manage: boolean }) {
  const ent = useEntitlements();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [confirm, setConfirm] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setErr("");
    try { await fn(); await ent.reload(); setConfirm(false); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  const need = m.blockedBy.map((id) => byId(id)?.name ?? id);
  return (
    <Card className={clsx("flex flex-col p-4", !m.available && "bg-surface2/50")}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold">{m.name}</h3>
        {m.active ? <Badge tone="sage">فعال</Badge> : m.available ? <Badge tone="sky">{m.installed ? "نیازمند پیش‌نیاز" : "در پلن شما"}</Badge> : <Badge tone="neutral"><Lock size={11} />{m.minPlan ? `از پلن ${m.minPlan}` : "جداگانه"}</Badge>}
      </div>
      <p className="mt-1 text-[11px] text-ink3">نسخه {m.version}{m.source === "addon" ? " · خرید تکی" : ""}</p>
      {need.length > 0 && <p className="mt-2 text-[11px] text-amber">نیازمند: {need.join("، ")}</p>}
      {err && <div className="mt-2"><ErrorNote message={err} /></div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {m.active && href(m.id) && <Link href={href(m.id)!} className="rounded-xl bg-rosesoft px-3.5 py-2 text-[13px] font-semibold text-rosedeep">باز کردن</Link>}
        {manage && m.installed && !m.scope.startsWith("PLATFORM") && (confirm
          ? <><Button variant="ghost" className="!text-danger" disabled={busy} onClick={() => run(() => crm.uninstallModule(m.id))}>حذف نصب</Button><Button variant="ghost" onClick={() => setConfirm(false)}>انصراف</Button></>
          : <Button variant="ghost" onClick={() => setConfirm(true)}>حذف نصب</Button>)}
        {manage && m.available && !m.installed && <Button disabled={busy} onClick={() => run(() => crm.installModule(m.id))}>نصب</Button>}
        {manage && !m.available && m.addonPurchasable && m.price > 0 && <Button disabled={busy} onClick={() => run(async () => { window.location.assign((await crm.payAddon(m.id)).paymentUrl); })}>خرید تکی · {toman(m.price)}/ماه</Button>}
        {!m.available && <span className="text-[11px] text-ink3">یا ارتقای پلن</span>}
      </div>
    </Card>
  );
}

/** Module catalog for the signed-in salon, straight from the entitlement API. Core modules are always on and listed separately. */
export function LiveModules() {
  const ent = useEntitlements();
  const me = useMe();
  const d = ent.data!;
  const core = d.modules.filter((m) => m.scope === "TENANT" && m.active && !moduleById(m.id));
  const rest = d.modules.filter((m) => moduleById(m.id));
  const cats = [...new Set(rest.map((m) => m.category))];
  return (
    <>
      <PageTitle title="ماژول‌ها" sub={`پلن ${d.plan?.title ?? "—"} · ${faNum(rest.filter((m) => m.active).length)} از ${faNum(rest.length)} ماژول فعال`} actions={<Link href="/settings" className="inline-flex items-center rounded-xl border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink2 hover:bg-surface2">ارتقای پلن</Link>} />
      {!d.subscriptionActive && <p className="mb-4 rounded-xl bg-ambersoft p-3 text-sm text-amber">اشتراک سالن فعال نیست؛ ماژول‌ها تا تمدید غیرفعال‌اند.</p>}
      {core.length > 0 && (
        <Card className="mb-5 p-5">
          <p className="mb-2 text-sm font-bold">هسته‌ی سالن (همیشه فعال)</p>
          <div className="flex flex-wrap gap-2">{core.map((m) => <Badge key={m.id} tone="sage">{m.name}</Badge>)}</div>
        </Card>
      )}
      {cats.map((cat) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-3 text-sm font-extrabold text-ink2">{cat}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rest.filter((m) => m.category === cat).map((m) => <Row key={m.id} m={m} byId={ent.get} manage={canManage(me)} />)}
          </div>
        </section>
      ))}
    </>
  );
}
