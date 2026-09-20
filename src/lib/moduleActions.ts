import { commit, getDB, TODAY_SHORT } from "./db";
import { moduleActive, moduleAvailable, moduleById, modulePrice, modulesAfterPlanChange } from "./modules";
import { ops } from "./ops";
import { toman } from "./fa";

const res = (ok: boolean, msg: string) => ({ ok, msg });

export const moduleActions = {
  install(id: string) {
    const d = getDB(); const m = moduleById(id);
    if (!m) return res(false, "ماژول پیدا نشد.");
    if (!moduleAvailable(d, id)) return res(false, "این ماژول در پلن شما نیست؛ پلن را ارتقا دهید یا آن را جداگانه بخرید.");
    const miss = (m.req ?? []).filter((r) => !moduleActive(d, r)).map((r) => moduleById(r)?.name);
    if (miss.length) return res(false, `ابتدا ماژول «${miss.join("، ")}» را نصب کنید.`);
    commit({ ...d, modules: { ...d.modules, installed: [...new Set([...d.modules.installed, id])] } });
    return res(true, `«${m.name}» نصب شد.`);
  },
  uninstall(id: string) {
    const d = getDB();
    commit({ ...d, modules: { ...d.modules, installed: d.modules.installed.filter((x) => x !== id) } });
    return res(true, "ماژول از منو حذف شد؛ داده‌های شما نگه داشته می‌شود و با نصب دوباره برمی‌گردد.");
  },
  /** خرید تکی ماژول (ماهانه) — از کیف پول یا آنلاین */
  buyAddon(id: string, method: "wallet" | "online") {
    const d = getDB(); const m = moduleById(id);
    if (!m) return res(false, "ماژول پیدا نشد.");
    if (moduleAvailable(d, id)) return res(false, "این ماژول از قبل در دسترس شماست.");
    const price = modulePrice(d, id);
    const wallet = d.wallets.s1 ?? 0;
    if (method === "wallet" && wallet < price) return res(false, `اعتبار کیف پول کافی نیست (${toman(price - wallet)} کم دارید).`);
    commit({
      ...d,
      wallets: method === "wallet" ? { ...d.wallets, s1: wallet - price } : d.wallets,
      modules: { installed: [...new Set([...d.modules.installed, id])], addons: [...new Set([...d.modules.addons, id])] },
      tenants: d.tenants.map((t) => (t.id === "t1" ? { ...t, payments: [{ day: 0, amount: price, label: `ماژول ${m.name} — ${method === "wallet" ? "کیف پول" : "آنلاین"}` }, ...t.payments] } : t)),
    });
    ops.notify("admin", "خرید تکی ماژول", `${d.salon.name}: ${m.name} (${toman(price)}/ماه)`, "/admin/modules");
    return res(true, `«${m.name}» خریداری و نصب شد (${toman(price)} در ماه).`);
  },
  removeAddon(id: string) { const d = getDB(); commit({ ...d, modules: { installed: d.modules.installed.filter((x) => x !== id), addons: d.modules.addons.filter((x) => x !== id) } }); },
  /** تغییر مستقیم پلن (ادمین/تننت t1) */
  setPlan(planId: string) { const d = getDB(); commit({ ...d, modules: modulesAfterPlanChange(d, planId), sub: { ...d.sub, planId } }); },

  // ---- ادمین ----
  setPlanModule(planId: string, id: string, on: boolean) {
    const d = getDB();
    const cur = d.planModules[planId] ?? [];
    commit({ ...d, planModules: { ...d.planModules, [planId]: on ? [...new Set([...cur, id])] : cur.filter((x) => x !== id) } });
  },
  setModulePrice(id: string, price: number) { const d = getDB(); commit({ ...d, modulePrices: { ...d.modulePrices, [id]: Math.max(0, price) } }); },
};
export { TODAY_SHORT };
