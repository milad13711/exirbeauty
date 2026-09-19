import { commit, getDB, type Customer } from "./db";
import type { WaitEntry } from "./seed-extra";
import { newCustomer, uid } from "./factories";
import { digits } from "./validate";
import { svcOf } from "./booking";

export const schedule = {
  moveAppt(id: string, to: { day: number; start: number; staffId: string }) {
    const d = getDB();
    commit({ ...d, appts: d.appts.map((a) => (a.id === id ? { ...a, ...to } : a)) });
  },
  addWait(w: Omit<WaitEntry, "id" | "status">) { const d = getDB(); commit({ ...d, waitlist: [{ ...w, id: uid("w"), status: "منتظر" }, ...d.waitlist] }); },
  setWaitStatus(id: string, status: WaitEntry["status"]) { const d = getDB(); commit({ ...d, waitlist: d.waitlist.map((w) => (w.id === id ? { ...w, status } : w)) }); },
  removeWait(id: string) { const d = getDB(); commit({ ...d, waitlist: d.waitlist.filter((w) => w.id !== id) }); },
  /** ثبت نوبت از لیست انتظار؛ مشتری با موبایل پیدا یا در CRM ساخته می‌شود */
  bookFromWait(waitId: string, slot: { day: number; start: number; staffId: string }) {
    const d = getDB();
    const w = d.waitlist.find((x) => x.id === waitId); const sv = w && svcOf(d, w.serviceId);
    if (!w || !sv) return;
    let cust: Customer | undefined = d.customers.find((c) => digits(c.phone).replace(/\s/g, "") === digits(w.phone).replace(/\s/g, ""));
    const customers = cust ? d.customers : [(cust = { ...newCustomer(), name: w.name, phone: w.phone, tags: ["لیست انتظار"] }), ...d.customers];
    commit({
      ...d, customers,
      appts: [...d.appts, { id: uid("b"), customerId: cust.id, staffId: slot.staffId, start: slot.start, dur: sv.min, client: w.name, service: sv.name, cat: sv.cat, status: "confirmed", day: slot.day }],
      waitlist: d.waitlist.map((x) => (x.id === waitId ? { ...x, status: "رزرو شد", customerId: cust!.id } : x)),
    });
  },
};
