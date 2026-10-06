import { Prisma, type Appointment } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, forbidden, notFound, tooMany } from "../../http/errors";
import { emit } from "../../platform/events";
import { planLimits } from "../../platform/limits";
import { assertModuleActive } from "../../platform/modules/service";
import { addVisit, findOrCreateByPhone } from "../customers/service";
import {
  ACTIVE, DEFAULT_HOURS, addDays, canTransition, earliestFor, fits, freeStarts, instantOf, isMovable, loadOf, tehranNow, weekdayOf, workWindow,
  type DayHours, type Interval, type Now, type Status,
} from "./availability";

// Every query is scoped by tenantId. Customers, services and staff are reached through their own modules' data
// and always re-checked against the tenant before use.

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);

// ───────── settings ─────────

export type Settings = { hours: DayHours[]; onlineEnabled: boolean; autoConfirm: boolean; leadHours: number; cancelHours: number; stepMin: number };

export async function getSettings(tenantId: string): Promise<Settings> {
  const s = await prisma.calendarSettings.findUnique({ where: { tenantId } });
  return s ? { hours: s.hours as DayHours[], onlineEnabled: s.onlineEnabled, autoConfirm: s.autoConfirm, leadHours: s.leadHours, cancelHours: s.cancelHours, stepMin: s.stepMin }
    : { hours: DEFAULT_HOURS, onlineEnabled: true, autoConfirm: false, leadHours: 2, cancelHours: 12, stepMin: 30 };
}

export async function putSettings(tenantId: string, p: Partial<Settings>) {
  const next = { ...(await getSettings(tenantId)), ...p };
  const data = { hours: next.hours as unknown as Prisma.InputJsonValue, onlineEnabled: next.onlineEnabled, autoConfirm: next.autoConfirm, leadHours: next.leadHours, cancelHours: next.cancelHours, stepMin: next.stepMin };
  await prisma.calendarSettings.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
  return next;
}

// ───────── availability ─────────

type StaffRow = { id: string; name: string; startMin: number; endMin: number; daysOff: number[]; breaks: unknown };
const breaksOf = (s: StaffRow): Interval[] => ((s.breaks as { s: number; e: number }[]) ?? []).map((b) => ({ s: b.s, e: b.e }));

async function activeService(tenantId: string, serviceId: string) {
  const svc = await prisma.service.findFirst({ where: { id: serviceId, tenantId, archivedAt: null, active: true }, include: { staff: { select: { staffId: true } } } });
  if (!svc) throw notFound("خدمت پیدا نشد یا فعال نیست");
  return svc;
}

/** Everything needed to judge one staff member on one date. */
async function dayContext(tenantId: string, staffIds: string[], date: string, settings: Settings, ignoreApptId?: string) {
  const [staff, leaves, appts] = await Promise.all([
    prisma.staff.findMany({ where: { tenantId, active: true, id: { in: staffIds } }, orderBy: { createdAt: "asc" } }),
    prisma.staffLeave.findMany({ where: { tenantId, staffId: { in: staffIds }, fromDate: { lte: day(date) }, toDate: { gte: day(date) } }, select: { staffId: true } }),
    prisma.appointment.findMany({ where: { tenantId, staffId: { in: staffIds }, date: day(date), status: { in: ACTIVE }, ...(ignoreApptId ? { id: { not: ignoreApptId } } : {}) }, select: { staffId: true, startMin: true, durationMin: true } }),
  ]);
  const onLeave = new Set(leaves.map((l) => l.staffId));
  return staff.map((s) => ({
    staff: s as StaffRow,
    window: workWindow({ weekday: weekdayOf(date), salonHours: settings.hours, staff: { startMin: s.startMin, endMin: s.endMin, daysOff: s.daysOff, breaks: [] }, onLeave: onLeave.has(s.id) }),
    breaks: breaksOf(s),
    busy: appts.filter((a) => a.staffId === s.id).map((a) => ({ s: a.startMin, e: a.startMin + a.durationMin })),
  }));
}

/** How full the day is: bookable minutes across active staff vs minutes already booked. */
export async function dayLoad(tenantId: string, date: string) {
  const settings = await getSettings(tenantId);
  const ids = (await prisma.staff.findMany({ where: { tenantId, active: true }, select: { id: true } })).map((s) => s.id);
  const ctx = await dayContext(tenantId, ids, date, settings);
  const t = ctx.reduce((a, c) => { const l = loadOf(c.window, c.breaks, c.busy); return { capacity: a.capacity + l.capacity, booked: a.booked + l.booked }; }, { capacity: 0, booked: 0 });
  return { ...t, pct: t.capacity ? Math.round((t.booked / t.capacity) * 100) : 0 };
}

export async function availability(tenantId: string, q: { serviceId: string; date: string; staffId?: string }, opts: { leadMin: number; now?: Now }) {
  const settings = await getSettings(tenantId);
  const svc = await activeService(tenantId, q.serviceId);
  const ids = svc.staff.map((x) => x.staffId).filter((id) => !q.staffId || id === q.staffId);
  const now = opts.now ?? tehranNow();
  const earliest = earliestFor(q.date, now, opts.leadMin);
  const ctx = await dayContext(tenantId, ids, q.date, settings);
  return {
    date: q.date, durationMin: svc.durationMin,
    staff: ctx.map((c) => ({ staffId: c.staff.id, name: c.staff.name, starts: Number.isFinite(earliest) ? freeStarts({ window: c.window, breaks: c.breaks, busy: c.busy, durationMin: svc.durationMin, stepMin: settings.stepMin, earliest }) : [] })),
  };
}

// ───────── appointments ─────────

const view = (a: Appointment & { customer?: { name: string; phone: string }; staff?: { name: string } }) => ({
  id: a.id, status: a.status, source: a.source, date: ymd(a.date), startMin: a.startMin, durationMin: a.durationMin, startAt: instantOf(ymd(a.date), a.startMin),
  customerId: a.customerId, customerName: a.customer?.name, customerPhone: a.customer?.phone, staffId: a.staffId, staffName: a.staff?.name,
  serviceId: a.serviceId, serviceName: a.serviceName, category: a.category, price: a.price, note: a.note, cancelReason: a.cancelReason,
});
const include = { customer: { select: { name: true, phone: true } }, staff: { select: { name: true } } } as const;

/** The database's overlap constraint is the final word; this turns its refusal into a clean 409. */
function slotTaken(e: unknown): never {
  const msg = e instanceof Error ? e.message : "";
  if (msg.includes("appt_no_overlap") || msg.includes("23P01") || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2010")) {
    throw conflict("این ساعت دیگر خالی نیست؛ زمان دیگری را انتخاب کنید", "SLOT_TAKEN");
  }
  throw e;
}

async function placeCheck(tenantId: string, a: { staffId: string; serviceId: string; date: string; startMin: number; durationMin: number }, opts: { grid: boolean; leadMin: number; ignoreApptId?: string; now?: Now }) {
  const settings = await getSettings(tenantId);
  const now = opts.now ?? tehranNow();
  const earliest = earliestFor(a.date, now, opts.leadMin);
  if (!Number.isFinite(earliest)) throw badRequest("نمی‌توان برای روز گذشته نوبت ثبت کرد");
  const [c] = await dayContext(tenantId, [a.staffId], a.date, settings, opts.ignoreApptId);
  if (!c) throw badRequest("متخصص پیدا نشد یا فعال نیست");
  const ok = opts.grid
    ? freeStarts({ window: c.window, breaks: c.breaks, busy: c.busy, durationMin: a.durationMin, stepMin: settings.stepMin, earliest }).includes(a.startMin)
    : a.startMin >= earliest && fits(c.window, c.breaks, c.busy, a.startMin, a.durationMin);
  if (!ok) throw conflict("این ساعت در دسترس نیست (خارج از ساعت کاری، استراحت، مرخصی یا نوبت دیگر)", "SLOT_UNAVAILABLE");
}

type NewAppt = { customerId: string; staffId: string; serviceId: string; date: string; startMin: number; note: string; status: "PENDING" | "CONFIRMED"; source: "STAFF" | "ONLINE" };

async function insertAppointment(tenantId: string, a: NewAppt, opts: { grid: boolean; leadMin: number; now?: Now }) {
  const svc = await activeService(tenantId, a.serviceId);
  if (!svc.staff.some((x) => x.staffId === a.staffId)) throw badRequest("این متخصص این خدمت را انجام نمی‌دهد");
  const customer = await prisma.customer.findFirst({ where: { id: a.customerId, tenantId, archivedAt: null }, select: { id: true } });
  if (!customer) throw badRequest("مشتری پیدا نشد");
  await placeCheck(tenantId, { ...a, durationMin: svc.durationMin }, opts);
  try {
    const created = await prisma.appointment.create({
      data: { tenantId, customerId: a.customerId, staffId: a.staffId, serviceId: svc.id, serviceName: svc.name, category: svc.category, price: svc.price, date: day(a.date), startMin: a.startMin, durationMin: svc.durationMin, status: a.status, source: a.source, note: a.note },
      include,
    });
    await emit("appointment.created", tenantId, { id: created.id });
    return view(created);
  } catch (e) { return slotTaken(e); }
}

// Staff may record walk-ins that started up to two hours ago (leadMin < 0); past days are still refused.
export const createByStaff = (tenantId: string, b: Omit<NewAppt, "source">) => insertAppointment(tenantId, { ...b, source: "STAFF" }, { grid: false, leadMin: -120 });

export async function list(tenantId: string, f: { date?: string; from?: string; to?: string; staffId?: string; customerId?: string; status?: Status }) {
  const from = f.date ?? f.from ?? tehranNow().date, to = f.date ?? f.to ?? from;
  if (to < from) throw badRequest("بازه‌ی تاریخ نامعتبر است");
  if ((day(to).getTime() - day(from).getTime()) / 86_400_000 > 62) throw badRequest("بازه‌ی تاریخ حداکثر ۶۲ روز است");
  const rows = await prisma.appointment.findMany({
    where: { tenantId, date: { gte: day(from), lte: day(to) }, ...(f.staffId ? { staffId: f.staffId } : {}), ...(f.customerId ? { customerId: f.customerId } : {}), ...(f.status ? { status: f.status } : {}) },
    orderBy: [{ date: "asc" }, { startMin: "asc" }], include,
  });
  return rows.map(view);
}

async function own(tenantId: string, id: string) {
  const a = await prisma.appointment.findFirst({ where: { id, tenantId }, include });
  if (!a) throw notFound("نوبت پیدا نشد");
  return a;
}
export const get = async (tenantId: string, id: string) => view(await own(tenantId, id));

export async function setNote(tenantId: string, id: string, note: string) {
  await own(tenantId, id);
  return view(await prisma.appointment.update({ where: { id }, data: { note }, include }));
}

export async function transition(tenantId: string, id: string, to: Status, reason?: string) {
  const a = await own(tenantId, id);
  if (!canTransition(a.status, to)) throw conflict(`از وضعیت «${a.status}» نمی‌توان به «${to}» رفت`, "BAD_TRANSITION", { from: a.status, to });
  // Claim the transition atomically so a double click / two devices can't apply it twice.
  const claimed = await prisma.appointment.updateMany({ where: { id, tenantId, status: a.status }, data: { status: to, ...(to === "CANCELED" ? { cancelReason: reason || null } : {}) } });
  if (claimed.count !== 1) throw conflict("وضعیت نوبت همین الان تغییر کرد؛ دوباره تلاش کنید", "STALE");
  if (to === "DONE") {
    // Service history on the customer profile (only reached once, thanks to the claim above).
    await addVisit(tenantId, a.customerId, { at: instantOf(ymd(a.date), a.startMin).toISOString(), service: a.serviceName, category: a.category, staffName: a.staff.name, price: a.price, note: a.note });
  }
  await emit("appointment.status", tenantId, { id, to });
  return view(await own(tenantId, id));
}

export async function move(tenantId: string, id: string, to: { date: string; startMin: number; staffId?: string }, opts: { grid?: boolean; leadMin?: number } = {}) {
  const a = await own(tenantId, id);
  if (!isMovable(a.status)) throw conflict("این نوبت دیگر قابل جابه‌جایی نیست", "BAD_TRANSITION", { from: a.status });
  const staffId = to.staffId ?? a.staffId;
  if (staffId !== a.staffId) {
    const svc = a.serviceId ? await prisma.serviceStaff.count({ where: { serviceId: a.serviceId, staffId } }) : 0;
    if (!svc) throw badRequest("این متخصص این خدمت را انجام نمی‌دهد");
  }
  await placeCheck(tenantId, { staffId, serviceId: a.serviceId ?? "", date: to.date, startMin: to.startMin, durationMin: a.durationMin }, { grid: opts.grid ?? false, leadMin: opts.leadMin ?? -120, ignoreApptId: id });
  let moved;
  try {
    moved = await prisma.appointment.update({ where: { id }, data: { date: day(to.date), startMin: to.startMin, staffId }, include });
  } catch (e) { return slotTaken(e); }
  await emit("appointment.moved", tenantId, { id });
  return view(moved);
}

// ───────── waitlist ─────────

export async function addWait(tenantId: string, w: { name: string; phone: string; serviceId: string; staffId?: string | null; fromDate: string; toDate: string; note: string }) {
  await activeService(tenantId, w.serviceId);
  if (w.staffId && !(await prisma.staff.count({ where: { id: w.staffId, tenantId } }))) throw badRequest("متخصص پیدا نشد");
  return prisma.waitlistEntry.create({ data: { tenantId, name: w.name, phone: w.phone, serviceId: w.serviceId, staffId: w.staffId ?? null, fromDate: day(w.fromDate), toDate: day(w.toDate), note: w.note } });
}

export const listWait = (tenantId: string) => prisma.waitlistEntry.findMany({ where: { tenantId, status: "WAITING" }, orderBy: { createdAt: "asc" }, take: 200 });

export async function cancelWait(tenantId: string, id: string) {
  const r = await prisma.waitlistEntry.updateMany({ where: { id, tenantId, status: "WAITING" }, data: { status: "CANCELED" } });
  if (!r.count) throw notFound("مورد پیدا نشد");
}

export async function bookFromWait(tenantId: string, id: string, slot: { staffId: string; date: string; startMin: number }) {
  const w = await prisma.waitlistEntry.findFirst({ where: { id, tenantId, status: "WAITING" } });
  if (!w) throw notFound("مورد پیدا نشد");
  const customer = await findOrCreateByPhone(tenantId, w.name, w.phone, "لیست انتظار");
  const appt = await insertAppointment(tenantId, { customerId: customer.id, staffId: slot.staffId, serviceId: w.serviceId, date: slot.date, startMin: slot.startMin, note: w.note, status: "CONFIRMED", source: "STAFF" }, { grid: false, leadMin: -120 });
  await prisma.waitlistEntry.update({ where: { id }, data: { status: "BOOKED" } });
  return appt;
}

// ───────── public online booking (/public/salons/:slug/…) ─────────

/** Resolves the salon and enforces everything that makes online booking available to it. */
async function publicTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.status !== "ACTIVE") throw notFound("سالن پیدا نشد");
  await assertModuleActive(tenant.id, "calendar");
  const settings = await getSettings(tenant.id);
  if (!settings.onlineEnabled) throw forbidden("رزرو آنلاین این سالن فعال نیست", "ONLINE_DISABLED");
  // Direct online booking is a plan feature (salon plan); other plans receive requests through the finder instead.
  if ((await planLimits(tenant.id)).directBooking !== true) throw forbidden("رزرو مستقیم در پلن این سالن فعال نیست", "PLAN_LIMIT", { feature: "directBooking" });
  return { tenant, settings };
}

export async function publicSalon(slug: string) {
  const { tenant } = await publicTenant(slug);
  const [services, staff] = await Promise.all([
    prisma.service.findMany({ where: { tenantId: tenant.id, archivedAt: null, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], include: { staff: { select: { staffId: true } } } }),
    prisma.staff.findMany({ where: { tenantId: tenant.id, active: true, listed: true }, select: { id: true, name: true, title: true, color: true, bio: true } }),
  ]);
  const bookable = new Set(staff.map((s) => s.id));
  return {
    name: tenant.name, city: tenant.city,
    services: services.map((s) => ({ id: s.id, category: s.category, name: s.name, price: s.price, durationMin: s.durationMin, staffIds: s.staff.map((x) => x.staffId).filter((x) => bookable.has(x)) })).filter((s) => s.staffIds.length),
    staff,
  };
}

export async function publicAvailability(slug: string, q: { serviceId: string; date: string; staffId?: string }) {
  const { tenant, settings } = await publicTenant(slug);
  const r = await availability(tenant.id, q, { leadMin: settings.leadHours * 60 });
  const listed = new Set((await prisma.staff.findMany({ where: { tenantId: tenant.id, listed: true }, select: { id: true } })).map((s) => s.id));
  return { ...r, staff: r.staff.filter((s) => listed.has(s.staffId)) };
}

export async function publicBook(slug: string, b: { serviceId: string; staffId?: string; date: string; startMin: number; name: string; phone: string; note: string }) {
  const { tenant, settings } = await publicTenant(slug);
  const horizon = addDays(tehranNow().date, 120);
  if (b.date > horizon) throw badRequest("رزرو بیش از ۱۲۰ روز آینده ممکن نیست");

  // Pick the staff member: the requested one, or the first who is actually free at that time.
  const svc = await activeService(tenant.id, b.serviceId);
  const listed = new Set((await prisma.staff.findMany({ where: { tenantId: tenant.id, listed: true, active: true }, select: { id: true } })).map((s) => s.id));
  const candidates = svc.staff.map((x) => x.staffId).filter((id) => listed.has(id) && (!b.staffId || id === b.staffId));
  if (!candidates.length) throw badRequest("متخصصی برای این خدمت در دسترس نیست");
  const a = await availability(tenant.id, { serviceId: b.serviceId, date: b.date }, { leadMin: settings.leadHours * 60 });
  const pick = a.staff.find((s) => candidates.includes(s.staffId) && s.starts.includes(b.startMin));
  if (!pick) throw conflict("این ساعت دیگر خالی نیست؛ زمان دیگری را انتخاب کنید", "SLOT_TAKEN");

  const customer = await findOrCreateByPhone(tenant.id, b.name, b.phone, "رزرو آنلاین");
  // Slot hoarding guard: a phone number can hold only a few open online appointments at once.
  const open = await prisma.appointment.count({ where: { tenantId: tenant.id, customerId: customer.id, source: "ONLINE", status: { in: ["PENDING", "CONFIRMED"] }, date: { gte: day(tehranNow().date) } } });
  if (open >= 3) throw tooMany("حداکثر ۳ نوبت فعال آنلاین برای هر شماره مجاز است");

  const appt = await insertAppointment(tenant.id, { customerId: customer.id, staffId: pick.staffId, serviceId: b.serviceId, date: b.date, startMin: b.startMin, note: b.note, status: settings.autoConfirm ? "CONFIRMED" : "PENDING", source: "ONLINE" }, { grid: true, leadMin: settings.leadHours * 60 });
  // The public caller gets a receipt, not the salon's internal record.
  return { id: appt.id, status: appt.status, date: appt.date, startMin: appt.startMin, serviceName: appt.serviceName, staffName: pick.name };
}

export async function publicWait(slug: string, w: { name: string; phone: string; serviceId: string; staffId?: string | null; fromDate: string; toDate: string; note: string }) {
  const { tenant } = await publicTenant(slug);
  if ((await prisma.waitlistEntry.count({ where: { tenantId: tenant.id, phone: w.phone, status: "WAITING" } })) >= 3) throw tooMany("حداکثر ۳ درخواست لیست انتظار برای هر شماره مجاز است");
  const e = await addWait(tenant.id, w);
  return { id: e.id };
}

