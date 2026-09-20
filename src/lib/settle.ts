import { commit, getDB, type DB, type Settlement, type StaffMember } from "./db";
import { uid } from "./factories";
import { fa, toman } from "./fa";
import type { Notification } from "./seed-extra";

/** مانده‌ی اولیه‌ی قابل تسویه‌ی هر متخصص در داده‌ی نمونه (بقیه‌ی کمیسیون قبلاً تسویه شده) */
const OPENING = [3_400_000, 2_800_000, 2_100_000, 1_200_000];
export const seedSettlements = (staff: StaffMember[]): Settlement[] =>
  staff.map((m, i) => ({ id: `sp-${m.id}`, staffId: m.id, amount: Math.max(0, m.commission - (OPENING[i] ?? 1_000_000)), note: "تسویه‌های قبلی", day: -20, status: "پرداخت شد" as const, method: "کارت" as const, paidDay: -20 }));

export const settlementsOf = (d: DB): Settlement[] => d.settlements ?? seedSettlements(d.staff);

/** مانده‌ی کیف پول متخصص: کمیسیون کسب‌شده − تسویه‌های پرداخت‌شده و در انتظار */
export function walletOf(d: DB, staffId: string) {
  const m = d.staff.find((x) => x.id === staffId);
  const list = settlementsOf(d).filter((x) => x.staffId === staffId);
  const paid = list.filter((x) => x.status === "پرداخت شد").reduce((a, x) => a + x.amount, 0);
  const pending = list.filter((x) => x.status === "در انتظار").reduce((a, x) => a + x.amount, 0);
  const earned = m?.commission ?? 0;
  return { earned, paid, pending, available: Math.max(0, earned - paid - pending), list };
}

const note = (d: DB, n: Omit<Notification, "id" | "day" | "read">): Notification[] => [{ ...n, id: uid("n"), day: 0, read: false }, ...d.notifications].slice(0, 80);

export const settle = {
  /** درخواست تسویه از طرف متخصص؛ برای مدیر سالن اعلان می‌رود */
  request(staffId: string, amount: number, text: string): string | null {
    const d = getDB();
    const m = d.staff.find((x) => x.id === staffId);
    if (!m) return "متخصص پیدا نشد.";
    const w = walletOf(d, staffId);
    if (!(amount > 0)) return "مبلغ را وارد کنید.";
    if (amount < 100_000) return "حداقل مبلغ درخواست ۱۰۰٬۰۰۰ تومان است.";
    if (amount > w.available) return `مبلغ از مانده‌ی قابل برداشت (${toman(w.available)}) بیشتر است.`;
    const s: Settlement = { id: uid("sq"), staffId, amount, note: text, day: 0, status: "در انتظار" };
    commit({ ...d, settlements: [s, ...settlementsOf(d)], notifications: note(d, { audience: "salon", title: `درخواست تسویه از ${m.name}`, body: `${toman(amount)}${text ? ` — ${text}` : ""}`, href: "/staff/settle" }) });
    return null;
  },
  cancel(id: string) { const d = getDB(); commit({ ...d, settlements: settlementsOf(d).map((x) => (x.id === id && x.status === "در انتظار" ? { ...x, status: "لغو شد" as const } : x)) }); },
  /** پرداخت توسط مدیر: ثبت به‌عنوان هزینه‌ی صندوق تا نقد مورد انتظار درست بماند */
  pay(id: string, method: "نقدی" | "کارت", ref: string) {
    const d = getDB();
    const s = settlementsOf(d).find((x) => x.id === id);
    if (!s || s.status !== "در انتظار") return;
    const m = d.staff.find((x) => x.id === s.staffId);
    commit({
      ...d,
      settlements: settlementsOf(d).map((x) => (x.id === id ? { ...x, status: "پرداخت شد" as const, method, ref, paidDay: 0 } : x)),
      expenses: [...d.expenses, { id: uid("e"), day: 0, title: `تسویه ${m?.name ?? "متخصص"}`, amount: s.amount, method, cat: "تسویه پرسنل" }],
    });
  },
  reject(id: string, reason: string) { const d = getDB(); commit({ ...d, settlements: settlementsOf(d).map((x) => (x.id === id && x.status === "در انتظار" ? { ...x, status: "رد شد" as const, reason } : x)) }); },
  /** تسویه‌ی مستقیم توسط مدیر بدون درخواست قبلی */
  payDirect(staffId: string, amount: number, method: "نقدی" | "کارت", ref: string): string | null {
    const d = getDB();
    const w = walletOf(d, staffId);
    if (!(amount > 0) || amount > w.available) return `مبلغ باید بین ۱ و ${fa(w.available.toLocaleString("en-US"))} تومان باشد.`;
    const id = uid("sq");
    commit({ ...d, settlements: [{ id, staffId, amount, note: "تسویه‌ی مستقیم توسط مدیر", day: 0, status: "در انتظار", } as Settlement, ...settlementsOf(d)] });
    settle.pay(id, method, ref);
    return null;
  },
};
