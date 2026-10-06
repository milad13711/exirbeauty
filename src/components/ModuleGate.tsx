"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Lock, PackagePlus } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useDB } from "@/lib/db";
import { useEntitlements } from "@/lib/entitlements";
import { crm, type ModuleEnt } from "@/lib/crmApi";
import { errorText } from "@/lib/api";
import { Spinner } from "@/components/live/ui";
import { minPlanFor, moduleActive, moduleAvailable, moduleById, moduleForPath, modulePrice, planLabel } from "@/lib/modules";
import { moduleActions } from "@/lib/moduleActions";
import { toman } from "@/lib/fa";

export function ModuleLocked({ id }: { id: string }) {
  const db = useDB();
  const m = moduleById(id)!;
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const avail = moduleAvailable(db, id);
  const missing = (m.req ?? []).filter((r) => !moduleActive(db, r));
  const plan = minPlanFor(db, id);
  const price = modulePrice(db, id);

  return (
    <Card className="mx-auto mt-6 max-w-lg p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rosesoft text-rose">{avail ? <PackagePlus size={26} /> : <Lock size={26} />}</span>
      <h1 className="mt-4 text-xl font-extrabold">{m.name}</h1>
      <p className="mt-2 text-sm leading-7 text-ink2">{m.desc}</p>
      {avail && missing.length === 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-sage">این ماژول در پلن شما هست ولی نصب نشده است.</p>
          <Button className="mt-4" onClick={() => { const r = moduleActions.install(id); setMsg({ ok: r.ok, t: r.msg }); }}>نصب ماژول</Button>
        </>
      )}
      {avail && missing.length > 0 && <p className="mt-4 rounded-xl bg-ambersoft p-3 text-sm text-amber">برای فعال شدن، ابتدا ماژول «{missing.map((x) => moduleById(x)?.name).join("، ")}» را نصب کنید.</p>}
      {!avail && (
        <div className="mt-5 space-y-3 text-sm">
          <p className="rounded-xl bg-surface2 p-3 text-ink2">در پلن فعلی شما ({planLabel[db.sub.planId]}) نیست{plan ? <> · از پلن <b>{planLabel[plan]}</b> به بالا در دسترس است</> : ""}.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/settings" className="rounded-xl bg-rose px-4 py-2.5 text-[13px] font-bold text-white">ارتقای پلن</Link>
            <Button variant="ghost" onClick={() => { const r = moduleActions.buyAddon(id, "wallet"); setMsg({ ok: r.ok, t: r.msg }); }}>خرید تکی با کیف پول · {toman(price)}/ماه</Button>
            <Button variant="ghost" onClick={() => { const r = moduleActions.buyAddon(id, "online"); setMsg({ ok: r.ok, t: r.msg }); }}>خرید تکی آنلاین</Button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={`mt-4 rounded-xl p-2.5 text-sm ${msg.ok ? "bg-sagesoft text-sage" : "bg-dangersoft text-danger"}`}>{msg.t}</p>}
      <Link href="/modules" className="mt-5 inline-block text-[13px] font-semibold text-rose">همه‌ی ماژول‌ها ←</Link>
    </Card>
  );
}

/** Locked screen driven by the salon's real entitlements: install, buy as an add-on, or upgrade. */
function LiveLocked({ m, byId }: { m: ModuleEnt; byId: (id: string) => ModuleEnt | undefined }) {
  const ent = useEntitlements();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = m.blockedBy.map((id) => byId(id)?.name ?? id);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setMsg(null);
    try { await fn(); await ent.reload(); } catch (e) { setMsg({ ok: false, t: errorText(e) }); setBusy(false); }
  }
  return (
    <Card className="mx-auto mt-6 max-w-lg p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rosesoft text-rose">{m.available ? <PackagePlus size={26} /> : <Lock size={26} />}</span>
      <h1 className="mt-4 text-xl font-extrabold">{m.name}</h1>
      {!ent.data?.subscriptionActive && <p className="mt-4 rounded-xl bg-ambersoft p-3 text-sm text-amber">اشتراک سالن فعال نیست؛ برای استفاده از ماژول‌ها اشتراک را تمدید کنید.</p>}
      {ent.data?.subscriptionActive && m.available && !m.installed && (
        <>
          <p className="mt-4 text-sm font-semibold text-sage">این ماژول در پلن شما هست ولی نصب نشده است.</p>
          <Button className="mt-4" disabled={busy} onClick={() => run(() => crm.installModule(m.id))}>نصب ماژول</Button>
        </>
      )}
      {m.available && m.installed && blocked.length > 0 && <p className="mt-4 rounded-xl bg-ambersoft p-3 text-sm text-amber">برای فعال شدن، ابتدا ماژول «{blocked.join("، ")}» را فعال کنید.</p>}
      {ent.data?.subscriptionActive && !m.available && (
        <div className="mt-5 space-y-3 text-sm">
          <p className="rounded-xl bg-surface2 p-3 text-ink2">در پلن فعلی شما ({ent.data?.plan?.title ?? "—"}) نیست{m.minPlan ? <> · از پلن <b>{m.minPlan}</b> به بالا در دسترس است</> : ""}.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/settings" className="rounded-xl bg-rose px-4 py-2.5 text-[13px] font-bold text-white">ارتقای پلن</Link>
            {m.addonPurchasable && m.price > 0 && <Button variant="ghost" disabled={busy} onClick={() => run(async () => { window.location.assign((await crm.payAddon(m.id)).paymentUrl); })}>خرید تکی · {toman(m.price)}/ماه</Button>}
          </div>
        </div>
      )}
      {msg && <p role="status" className="mt-4 rounded-xl bg-dangersoft p-2.5 text-sm text-danger">{msg.t}</p>}
      <Link href="/modules" className="mt-5 inline-block text-[13px] font-semibold text-rose">همه‌ی ماژول‌ها ←</Link>
    </Card>
  );
}

/** مسیرهای هر ماژول فقط وقتی فعال است باز می‌شود؛ هسته همیشه باز است */
export function ModuleGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const db = useDB();
  const ent = useEntitlements();
  const m = moduleForPath(path);
  if (!m) return <>{children}</>;
  if (ent.loading) return <Spinner />;
  if (ent.live) {
    const e = ent.get(m.id);
    return !e || e.active ? <>{children}</> : <LiveLocked m={e} byId={ent.get} />;
  }
  return moduleActive(db, m.id) ? <>{children}</> : <ModuleLocked id={m.id} />;
}
