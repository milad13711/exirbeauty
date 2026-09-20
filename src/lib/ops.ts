import { commit, getDB, TODAY_SHORT, type DB } from "./db";
import type { Course, Notification, Post, ReviewCfg, Survey, Tenant, Ticket, TicketMsg } from "./seed-extra";
import { withPoints } from "./loyalty";
import { moduleActive } from "./modules";
import { uid } from "./factories";
import { fa, toman } from "./fa";

const patch = (fn: (d: DB) => Partial<DB>) => { const d = getDB(); commit({ ...d, ...fn(d) }); };
const push = (d: DB, n: Omit<Notification, "id" | "day" | "read">): Notification[] => [{ ...n, id: uid("n"), day: 0, read: false }, ...d.notifications].slice(0, 80);

export const ops = {
  // ---------- اعلان‌ها ----------
  notify(audience: Notification["audience"], title: string, body: string, href: string) { patch((d) => ({ notifications: push(d, { audience, title, body, href }) })); },
  markRead(id: string) { patch((d) => ({ notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })); },
  markAllRead(audience: Notification["audience"]) { patch((d) => ({ notifications: d.notifications.map((n) => (n.audience === audience ? { ...n, read: true } : n)) })); },

  // ---------- نظرسنجی ----------
  /** بعد از هر فاکتور خدمت: درخواست نظرسنجی خودکار برای مشتری (اگر روشن باشد) */
  requestSurvey(saleId: string, customerId: string | null, name: string, lines: { name: string; staffId?: string }[]) {
    const d = getDB();
    const svc = lines.find((l) => l.staffId);
    if (!d.reviewCfg.auto || !customerId || !svc || !moduleActive(d, "reviews")) return;
    const staff = d.staff.find((x) => x.id === svc.staffId);
    const sv: Survey = { id: uid("sv"), customerId, name, service: svc.name, staff: staff?.name ?? "—", staffId: svc.staffId, saleId, rating: null, comment: "", day: 0, status: "منتظر پاسخ" };
    commit({ ...d, surveys: [sv, ...d.surveys] });
  },
  saveReviewCfg(c: ReviewCfg) { patch(() => ({ reviewCfg: c })); },
  /** ثبت پاسخ مشتری: رضایت بالا ← درخواست نظر عمومی؛ پایین ← پیام خصوصی به مدیر */
  submitSurvey(id: string, rating: number, comment: string): { route: "public" | "private" } {
    const d = getDB();
    const s = d.surveys.find((x) => x.id === id);
    const route: "public" | "private" = rating >= d.reviewCfg.threshold ? "public" : "private";
    if (!s || s.status === "پاسخ داده شد") return { route: s?.route ?? route };
    const answered = d.surveys.map((x) => (x.id === id ? { ...x, rating, comment, status: "پاسخ داده شد" as const, route, day: 0, resolved: route === "private" ? false : undefined } : x));
    // میانگین رضایت متخصص
    const rated = answered.filter((x) => x.staffId === s.staffId && x.rating);
    const avg = rated.length ? Math.round((rated.reduce((a, x) => a + (x.rating ?? 0), 0) / rated.length) * 10) / 10 : 0;
    commit({
      ...d, surveys: answered,
      staff: d.staff.map((m) => (m.id === s.staffId && avg ? { ...m, rating: avg } : m)),
      customers: d.reviewCfg.points && s.customerId ? d.customers.map((c) => (c.id === s.customerId ? withPoints(d, c, d.loyalty.earn.find((e) => e.id === "review")?.pts ?? 0, "ثبت نظر") : c)) : d.customers,
      notifications: route === "private" ? push(d, { audience: "salon", title: "بازخورد منفی", body: `${s.name} امتیاز ${fa(rating)} داد؛ لطفاً پیگیری کنید`, href: "/reviews" }) : d.notifications,
    });
    return { route };
  },
  replySurvey(id: string, reply: string, resolved: boolean) { patch((d) => ({ surveys: d.surveys.map((x) => (x.id === id ? { ...x, reply, resolved } : x)) })); },

  // ---------- محتوا ----------
  savePost(p: Post) { patch((d) => ({ posts: d.posts.some((x) => x.id === p.id) ? d.posts.map((x) => (x.id === p.id ? p : x)) : [p, ...d.posts] })); },
  deletePost(id: string) { patch((d) => ({ posts: d.posts.filter((x) => x.id !== id) })); },

  // ---------- آکادمی ----------
  saveCourse(c: Course) { patch((d) => ({ courses: d.courses.some((x) => x.id === c.id) ? d.courses.map((x) => (x.id === c.id ? c : x)) : [c, ...d.courses] })); },
  deleteCourse(id: string) { patch((d) => ({ courses: d.courses.filter((x) => x.id !== id), enrollments: d.enrollments.filter((e) => e.courseId !== id) })); },
  includedInPlan(inPlan: string, planId: string) { return inPlan === "همه‌ی پلن‌ها" || (inPlan === "حرفه‌ای و بالاتر" && (planId === "pro" || planId === "elite")) || (inPlan === "سازمانی" && planId === "elite"); },
  /** ثبت‌نام: رایگان یا شامل پلن یا پرداخت از کیف پول سالن */
  enroll(courseId: string): { ok: boolean; msg: string } {
    const d = getDB();
    const c = d.courses.find((x) => x.id === courseId);
    if (!c || !c.published) return { ok: false, msg: "دوره پیدا نشد." };
    if (d.enrollments.some((e) => e.courseId === courseId)) return { ok: true, msg: "قبلاً ثبت‌نام کرده‌اید." };
    const free = c.price === 0 || ops.includedInPlan(c.inPlan, d.sub.planId);
    const wallet = d.wallets.s1 ?? 0;
    if (!free && wallet < c.price) return { ok: false, msg: `برای این دوره ${toman(c.price - wallet)} اعتبار کیف پول کم دارید. از تنظیمات ← اشتراک یا فروشگاه اعتبار بگیرید.` };
    commit({ ...d, wallets: free ? d.wallets : { ...d.wallets, s1: wallet - c.price }, enrollments: [{ id: uid("en"), courseId, done: [], day: 0, paid: free ? 0 : c.price }, ...d.enrollments] });
    return { ok: true, msg: free ? "ثبت‌نام انجام شد." : `ثبت‌نام انجام شد؛ ${toman(c.price)} از کیف پول کسر شد.` };
  },
  completeLesson(courseId: string, lessonId: string) { patch((d) => ({ enrollments: d.enrollments.map((e) => (e.courseId === courseId && !e.done.includes(lessonId) ? { ...e, done: [...e.done, lessonId] } : e)) })); },

  // ---------- پشتیبانی ----------
  createTicket(t: { subject: string; category: string; priority: Ticket["priority"]; text: string; tenantId: string; name: string }): string {
    const d = getDB();
    const n = 1001 + d.tickets.length;
    const id = `T-${n}`;
    const tk: Ticket = { id, subject: t.subject, category: t.category, priority: t.priority, status: "باز", tenantId: t.tenantId, day: 0, messages: [{ from: "salon", name: t.name, text: t.text, day: 0 }] };
    commit({ ...d, tickets: [tk, ...d.tickets], notifications: push(d, { audience: "admin", title: t.priority === "فوری" ? "تیکت فوری" : "تیکت جدید", body: `${d.tenants.find((x) => x.id === t.tenantId)?.name ?? "سالن"}: ${t.subject}`, href: "/admin/tickets" }) });
    return id;
  },
  replyTicket(id: string, msg: Omit<TicketMsg, "day">) {
    patch((d) => {
      const tk = d.tickets.find((x) => x.id === id);
      return {
        tickets: d.tickets.map((x) => (x.id === id ? { ...x, messages: [...x.messages, { ...msg, day: 0 }], status: msg.from === "admin" && x.status === "باز" ? ("در حال بررسی" as const) : msg.from === "salon" && x.status === "بسته" ? ("باز" as const) : x.status } : x)),
        notifications: msg.from === "admin" ? push(d, { audience: "salon", title: "پاسخ پشتیبانی", body: tk?.subject ?? "", href: "/support" }) : push(d, { audience: "admin", title: "پیام جدید در تیکت", body: tk?.subject ?? "", href: "/admin/tickets" }),
      };
    });
  },
  setTicket(id: string, p: Partial<Pick<Ticket, "status" | "priority">>) { patch((d) => ({ tickets: d.tickets.map((x) => (x.id === id ? { ...x, ...p } : x)) })); },

  // ---------- تننت‌ها ----------
  saveTenant(t: Tenant) { patch((d) => ({ tenants: d.tenants.map((x) => (x.id === t.id ? t : x)) })); },
  addNote(id: string, note: string) { patch((d) => ({ tenants: d.tenants.map((x) => (x.id === id ? { ...x, notes: [`${TODAY_SHORT} · ${note}`, ...x.notes] } : x)) })); },
  /** تمدید دستی اشتراک + ثبت پرداخت */
  extend(id: string, months: number, amount: number, label: string) {
    patch((d) => ({ tenants: d.tenants.map((x) => (x.id === id ? { ...x, status: "فعال" as const, expiry: /روز دیگر|ماه دیگر/.test(x.expiry) ? `${fa(months)} ماه دیگر` : `${fa(months)} ماه بعد از ${x.expiry}`, payments: [{ day: 0, amount, label }, ...x.payments] } : x)) }));
  },
};
