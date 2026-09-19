import { commit, getDB, TODAY_SHORT } from "./db";
import { NOW_MIN } from "./mock";
import { digits } from "./validate";
import { withPoints } from "./sales";
import { newCustomer } from "./factories";
import { fa, num } from "./fa";

/** ساعت مانده تا شروع نوبت (نوبت‌های امروز نسبت به «اکنون» سنجیده می‌شوند) */
export const hoursUntil = (a: { day: number; start: number }) => (a.day * 1440 + a.start - NOW_MIN) / 60;

export const portal = {
  findByPhone: (phone: string) => getDB().customers.find((c) => digits(c.phone).replace(/\s/g, "") === digits(phone).replace(/\s/g, "")),
  login(customerId: string) { const d = getDB(); commit({ ...d, portal: customerId }); },
  logout() { const d = getDB(); commit({ ...d, portal: null }); },
  register(name: string, phone: string, ref?: string): string {
    const d = getDB();
    const c = { ...newCustomer(), name, phone, tags: ["ثبت‌نام آنلاین"], referredBy: ref && d.customers.some((x) => x.id === ref) ? ref : undefined };
    commit({ ...d, customers: [c, ...d.customers], portal: c.id });
    return c.id;
  },
  /** لغو نوبت توسط مشتری؛ فقط تا مهلت لغوِ تنظیم‌شده‌ی سالن */
  cancel(apptId: string, customerId: string): { ok: boolean; msg: string } {
    const d = getDB();
    const a = d.appts.find((x) => x.id === apptId);
    if (!a || a.customerId !== customerId) return { ok: false, msg: "این نوبت پیدا نشد." };
    if (hoursUntil(a) < d.salon.online.cancelHours) return { ok: false, msg: `لغو آنلاین فقط تا ${fa(d.salon.online.cancelHours)} ساعت قبل از نوبت ممکن است؛ لطفاً با سالن تماس بگیرید.` };
    commit({ ...d, appts: d.appts.filter((x) => x.id !== apptId) });
    return { ok: true, msg: "نوبت شما لغو شد." };
  },
  /** خرج امتیاز: جایزه به‌صورت اعتبار کیف پول ثبت می‌شود */
  redeem(customerId: string, rewardId: string): { ok: boolean; msg: string } {
    const d = getDB();
    const c = d.customers.find((x) => x.id === customerId), r = d.loyalty.rewards.find((x) => x.id === rewardId);
    if (!c || !r) return { ok: false, msg: "جایزه پیدا نشد." };
    if (c.points < r.cost) return { ok: false, msg: `برای این جایزه ${fa(r.cost - c.points)} امتیاز دیگر لازم است.` };
    const n = withPoints(d, { ...c, wallet: c.wallet + r.value, walletLog: [{ d: TODAY_SHORT, delta: r.value, note: `جایزه: ${r.name}` }, ...c.walletLog] }, -r.cost, `دریافت جایزه: ${r.name}`);
    commit({ ...d, customers: d.customers.map((x) => (x.id === customerId ? n : x)) });
    return { ok: true, msg: `«${r.name}» به کیف پول شما اضافه شد.` };
  },
  /** فعال‌سازی کارت هدیه: مانده‌ی کارت به کیف پول منتقل می‌شود */
  redeemGift(customerId: string, code: string): { ok: boolean; msg: string } {
    const d = getDB();
    const g = d.giftCards.find((x) => x.code === code.trim().toUpperCase());
    if (!g || g.status !== "فعال" || g.balance <= 0) return { ok: false, msg: "کد کارت هدیه معتبر و فعال نیست." };
    commit({
      ...d,
      giftCards: d.giftCards.map((x) => (x.id === g.id ? { ...x, balance: 0, status: "استفاده‌شده" } : x)),
      customers: d.customers.map((c) => (c.id === customerId ? { ...c, wallet: c.wallet + g.balance, walletLog: [{ d: TODAY_SHORT, delta: g.balance, note: `کارت هدیه ${g.code}` }, ...c.walletLog] } : c)),
    });
    return { ok: true, msg: `${num(g.balance)} تومان به کیف پول شما اضافه شد.` };
  },
};
