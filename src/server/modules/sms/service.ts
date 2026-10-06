import { Prisma, type SmsKind } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import { assertModuleActive } from "../../platform/modules/service";
import { smsGateway } from "../../platform/sms";
import { addDays, instantOf, tehranNow, type Now } from "../calendar/availability";
import { MAX_TEXT, SCENARIO_DEFAULTS, SCENARIO_KINDS, dateFa, normalizePhone, packageCredit, parts, render, timeFa, type Kind } from "./text";

// Every query is scoped by tenantId. Credit is whole toman; a message costs parts × the platform's sell price.

// ───────── platform settings: pricing & packages (admin-editable) ─────────

const PRICING_KEY = "sms.pricing";
export type Pricing = { sell: number };
export async function getPricing(): Promise<Pricing> {
  const row = await prisma.platformSetting.findUnique({ where: { key: PRICING_KEY } });
  const v = (row?.value ?? {}) as Partial<Pricing>;
  return { sell: typeof v.sell === "number" && v.sell > 0 ? v.sell : 190 };
}
export const setPricing = async (p: Pricing) => {
  await prisma.platformSetting.upsert({ where: { key: PRICING_KEY }, create: { key: PRICING_KEY, value: p }, update: { value: p } });
  return p;
};

export const listPackages = (all = false) => prisma.smsPackage.findMany({ where: all ? {} : { active: true }, orderBy: [{ sortOrder: "asc" }, { price: "asc" }] });
export const createPackage = (d: { name: string; price: number; bonusPct: number; sortOrder: number }) => prisma.smsPackage.create({ data: d });
export async function updatePackage(id: string, d: { name?: string; price?: number; bonusPct?: number; sortOrder?: number; active?: boolean }) {
  if (!(await prisma.smsPackage.count({ where: { id } }))) throw notFound("بسته پیدا نشد");
  return prisma.smsPackage.update({ where: { id }, data: d });
}

// ───────── credit ─────────

export async function account(tenantId: string) {
  const a = await prisma.smsAccount.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
  return { balance: a.balance, lowThreshold: a.lowThreshold, low: a.balance < a.lowThreshold, pricing: await getPricing() };
}
export async function setThreshold(tenantId: string, lowThreshold: number) {
  await prisma.smsAccount.upsert({ where: { tenantId }, create: { tenantId, lowThreshold }, update: { lowThreshold } });
  return account(tenantId);
}

type Tx = Prisma.TransactionClient;
async function addCredit(tx: Tx, tenantId: string, amount: number, kind: "TOPUP" | "BONUS" | "REFUND" | "ADJUST", ref: string | null, note: string) {
  await tx.smsAccount.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
  // Atomic: concurrent credits/debits never lose an update.
  const [{ balance }] = await tx.$queryRaw<{ balance: number }[]>`UPDATE "SmsAccount" SET "balance" = "balance" + ${amount}, "updatedAt" = now() WHERE "tenantId" = ${tenantId} RETURNING "balance"`;
  await tx.smsTx.create({ data: { tenantId, delta: amount, balanceAfter: balance, kind, ref, note } });
  return balance;
}
/** Returns the new balance, or null when there isn't enough credit (nothing changes). */
async function debit(tx: Tx, tenantId: string, amount: number, ref: string): Promise<number | null> {
  const rows = await tx.$queryRaw<{ balance: number }[]>`UPDATE "SmsAccount" SET "balance" = "balance" - ${amount}, "updatedAt" = now() WHERE "tenantId" = ${tenantId} AND "balance" >= ${amount} RETURNING "balance"`;
  if (!rows.length) return null;
  await tx.smsTx.create({ data: { tenantId, delta: -amount, balanceAfter: rows[0].balance, kind: "SEND", ref, note: "" } });
  return rows[0].balance;
}

/** Applied by the payment callback once a top-up is verified (the payment's PAID claim makes this run once). */
export async function applyTopup(tenantId: string, packageId: string, paymentId: string) {
  const pkg = await prisma.smsPackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw notFound("بسته پیدا نشد");
  const total = packageCredit(pkg.price, pkg.bonusPct);
  await prisma.$transaction(async (tx) => {
    await addCredit(tx, tenantId, pkg.price, "TOPUP", paymentId, `بسته ${pkg.name}`);
    if (total > pkg.price) await addCredit(tx, tenantId, total - pkg.price, "BONUS", paymentId, `هدیه بسته ${pkg.name}`);
  });
}

export async function adjust(tenantId: string, delta: number, note: string) {
  if (!(await prisma.tenant.count({ where: { id: tenantId } }))) throw notFound("سالن پیدا نشد");
  try {
    await prisma.$transaction((tx) => addCredit(tx, tenantId, delta, "ADJUST", null, note));
  } catch (e) {
    if (e instanceof Error && e.message.includes("sms_balance_nonneg")) throw conflict("اعتبار نمی‌تواند منفی شود", "NEGATIVE_BALANCE");
    throw e;
  }
  return account(tenantId);
}

export async function quoteTopup(packageId: string) {
  const pkg = await prisma.smsPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.active) throw notFound("بسته پیدا نشد");
  return pkg;
}

// ───────── sending ─────────

type SendInput = { customerId?: string | null; phone: string; text: string; kind: SmsKind; relatedId?: string | null };
export type SendResult = { status: "SENT" | "FAILED" | "BLOCKED" | "DUPLICATE"; id?: string; cost?: number };

/** A gateway that hangs must not hold up a booking request. */
const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("SMS gateway timeout")), ms))]);

/**
 * Reserve → charge → send → settle. The row is created first (a partial unique index makes an automatic message
 * go out at most once per (kind, relatedId)); credit is debited atomically before sending and refunded if the
 * gateway fails, so a failure never costs the salon and a send never overdraws.
 */
export async function sendSms(tenantId: string, i: SendInput): Promise<SendResult> {
  const phone = normalizePhone(i.phone);
  if (!phone) throw badRequest("شماره موبایل معتبر نیست");
  const text = i.text.trim();
  if (!text || [...text].length > MAX_TEXT) throw badRequest(`متن پیامک باید بین ۱ تا ${MAX_TEXT} کاراکتر باشد`);
  const n = parts(text);
  const cost = n * (await getPricing()).sell;

  let msg;
  try {
    msg = await prisma.smsMessage.create({ data: { tenantId, customerId: i.customerId ?? null, phone, text, parts: n, cost, kind: i.kind, status: "QUEUED", relatedId: i.relatedId ?? null } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { status: "DUPLICATE" };
    throw e;
  }
  const charged = await prisma.$transaction(async (tx) => { await tx.smsAccount.upsert({ where: { tenantId }, create: { tenantId }, update: {} }); return debit(tx, tenantId, cost, msg.id); });
  if (charged === null) {
    await prisma.smsMessage.update({ where: { id: msg.id }, data: { status: "BLOCKED", cost: 0, reason: "NO_CREDIT" } });
    return { status: "BLOCKED", id: msg.id };
  }
  try {
    await withTimeout(smsGateway().send(phone, text), 8000);
    await prisma.smsMessage.update({ where: { id: msg.id }, data: { status: "SENT" } });
    return { status: "SENT", id: msg.id, cost };
  } catch (e) {
    console.error("[sms] gateway send failed", e);
    await prisma.$transaction(async (tx) => {
      await addCredit(tx, tenantId, cost, "REFUND", msg.id, "ارسال ناموفق");
      await tx.smsMessage.update({ where: { id: msg.id }, data: { status: "FAILED", cost: 0, reason: "GATEWAY" } });
    });
    return { status: "FAILED", id: msg.id };
  }
}

export async function sendManual(tenantId: string, b: { customerId?: string | null; phone?: string; text: string }) {
  let phone = b.phone, customerId: string | null = null;
  if (b.customerId) {
    const c = await prisma.customer.findFirst({ where: { id: b.customerId, tenantId, archivedAt: null }, select: { id: true, phone: true } });
    if (!c) throw badRequest("مشتری پیدا نشد");
    phone = c.phone; customerId = c.id;
  }
  if (!phone) throw badRequest("مشتری یا شماره را مشخص کنید");
  const r = await sendSms(tenantId, { customerId, phone, text: b.text, kind: "MANUAL" });
  if (r.status === "BLOCKED") throw conflict("اعتبار پیامک کافی نیست؛ ابتدا شارژ کنید", "NO_CREDIT");
  if (r.status === "FAILED") throw new (await import("../../http/errors")).HttpError(502, "SMS_FAILED", "ارسال پیامک ناموفق بود؛ اعتباری کسر نشد");
  return r;
}

// ───────── scenarios (editable templates) ─────────

export async function scenarios(tenantId: string) {
  const rows = new Map((await prisma.smsScenario.findMany({ where: { tenantId } })).map((r) => [r.kind, r]));
  return SCENARIO_KINDS.map((kind) => {
    const d = SCENARIO_DEFAULTS[kind], r = rows.get(kind);
    return { kind, title: d.title, vars: d.vars, enabled: r?.enabled ?? d.enabled, template: r?.template ?? d.template, custom: !!r };
  });
}
export async function putScenario(tenantId: string, kind: string, p: { enabled?: boolean; template?: string }) {
  if (!(SCENARIO_KINDS as string[]).includes(kind)) throw notFound("سناریو پیدا نشد");
  const k = kind as Exclude<Kind, "MANUAL">;
  const cur = (await scenarios(tenantId)).find((s) => s.kind === k)!;
  const template = (p.template ?? cur.template).trim();
  if (!template || [...template].length > MAX_TEXT) throw badRequest(`متن پیامک باید بین ۱ تا ${MAX_TEXT} کاراکتر باشد`);
  await prisma.smsScenario.upsert({ where: { tenantId_kind: { tenantId, kind: k } }, create: { tenantId, kind: k, enabled: p.enabled ?? cur.enabled, template }, update: { enabled: p.enabled ?? cur.enabled, template } });
  return (await scenarios(tenantId)).find((s) => s.kind === k)!;
}

/** Sends a scenario message for an appointment, if the salon has that scenario on. */
async function sendScenario(tenantId: string, kind: Exclude<Kind, "MANUAL">, a: ApptCtx, relatedId: string) {
  const s = (await scenarios(tenantId)).find((x) => x.kind === kind)!;
  if (!s.enabled) return null;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const text = render(s.template, { name: a.customerName, salon: tenant?.name ?? "", service: a.serviceName, staff: a.staffName, date: dateFa(a.date), time: timeFa(a.startMin) });
  return sendSms(tenantId, { customerId: a.customerId, phone: a.phone, text, kind, relatedId });
}

type ApptCtx = { customerId: string; customerName: string; phone: string; serviceName: string; staffName: string; date: string; startMin: number };
async function apptCtx(tenantId: string, id: string): Promise<(ApptCtx & { status: string }) | null> {
  const a = await prisma.appointment.findFirst({ where: { id, tenantId }, include: { customer: { select: { id: true, name: true, phone: true } }, staff: { select: { name: true } } } });
  if (!a) return null;
  return { status: a.status, customerId: a.customer.id, customerName: a.customer.name, phone: a.customer.phone, serviceName: a.serviceName, staffName: a.staff.name, date: a.date.toISOString().slice(0, 10), startMin: a.startMin };
}

// ───────── event reactions (wired in the manifest) ─────────

export async function onAppointmentCreated(tenantId: string, p: Record<string, unknown>) {
  const a = await apptCtx(tenantId, String(p.id));
  if (a?.status === "CONFIRMED") await sendScenario(tenantId, "CONFIRM", a, `${p.id}`);
}
export async function onAppointmentStatus(tenantId: string, p: Record<string, unknown>) {
  const a = await apptCtx(tenantId, String(p.id));
  if (!a) return;
  if (p.to === "CONFIRMED") await sendScenario(tenantId, "CONFIRM", a, `${p.id}`);
  else if (p.to === "CANCELED") await sendScenario(tenantId, "CANCEL", a, `${p.id}`);
  else if (p.to === "DONE") await sendScenario(tenantId, "THANKS", a, `${p.id}`);
}
export async function onAppointmentMoved(tenantId: string, p: Record<string, unknown>) {
  const a = await apptCtx(tenantId, String(p.id));
  if (a && (a.status === "CONFIRMED" || a.status === "PENDING")) await sendScenario(tenantId, "MOVED", a, `${p.id}:${a.date}:${a.startMin}`);
}

// ───────── scheduled work (called by a cron hitting /sms/cron/run) ─────────

/** Reminders for confirmed appointments and birthday greetings. Safe to run as often as you like: each message goes out once. */
export async function runDue(now: Now = tehranNow(), at: Date = new Date()) {
  const out = { reminders: 0, birthdays: 0, skipped: 0 };
  const active = async (tenantId: string) => assertModuleActive(tenantId, "sms").then(() => true, () => false);

  const appts = await prisma.appointment.findMany({
    where: { status: "CONFIRMED", date: { gte: new Date(`${now.date}T00:00:00Z`), lte: new Date(`${addDays(now.date, 1)}T00:00:00Z`) } },
    select: { id: true, tenantId: true },
  });
  const okTenants = new Map<string, boolean>();
  for (const { id, tenantId } of appts) {
    if (!okTenants.has(tenantId)) okTenants.set(tenantId, await active(tenantId));
    if (!okTenants.get(tenantId)) continue;
    const a = await apptCtx(tenantId, id);
    if (!a) continue;
    const mins = (instantOf(a.date, a.startMin).getTime() - at.getTime()) / 60_000;
    if (mins <= 0) continue;
    // Within 2h → the short reminder; within 24h → the day-before one. (A booking made 3h ahead skips the 24h message.)
    const kind = mins <= 120 ? "REMINDER_2" : mins <= 1440 ? "REMINDER_24" : null;
    if (!kind) continue;
    const r = await sendScenario(tenantId, kind, a, id);
    if (r?.status === "SENT") out.reminders++; else out.skipped++;
  }

  const [, m, d] = now.date.split("-").map(Number);
  const birthdays = await prisma.$queryRaw<{ id: string; tenantId: string; name: string; phone: string }[]>`
    SELECT "id", "tenantId", "name", "phone" FROM "Customer" WHERE "archivedAt" IS NULL AND "birthDate" IS NOT NULL AND EXTRACT(MONTH FROM "birthDate") = ${m} AND EXTRACT(DAY FROM "birthDate") = ${d}`;
  for (const c of birthdays) {
    if (!okTenants.has(c.tenantId)) okTenants.set(c.tenantId, await active(c.tenantId));
    if (!okTenants.get(c.tenantId)) continue;
    const s = (await scenarios(c.tenantId)).find((x) => x.kind === "BIRTHDAY")!;
    if (!s.enabled) continue;
    const tenant = await prisma.tenant.findUnique({ where: { id: c.tenantId }, select: { name: true } });
    const r = await sendSms(c.tenantId, { customerId: c.id, phone: c.phone, text: render(s.template, { name: c.name, salon: tenant?.name ?? "" }), kind: "BIRTHDAY", relatedId: `${c.id}:${now.date.slice(0, 4)}` });
    if (r.status === "SENT") out.birthdays++; else out.skipped++;
  }
  return out;
}

// ───────── history & stats ─────────

export const messages = (tenantId: string, q: { status?: string; limit: number }) =>
  prisma.smsMessage.findMany({ where: { tenantId, ...(q.status ? { status: q.status as never } : {}) }, orderBy: { createdAt: "desc" }, take: q.limit });
export const transactions = (tenantId: string, limit: number) => prisma.smsTx.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: limit });

export async function stats(tenantId: string, days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const g = await prisma.smsMessage.groupBy({ by: ["status", "kind"], where: { tenantId, createdAt: { gte: since } }, _count: true, _sum: { parts: true, cost: true } });
  const sum = (f: (r: (typeof g)[number]) => boolean, k: "parts" | "cost" | "count") => g.filter(f).reduce((a, r) => a + (k === "count" ? r._count : (r._sum[k] ?? 0)), 0);
  return {
    days,
    sent: sum((r) => r.status === "SENT", "count"), failed: sum((r) => r.status === "FAILED", "count"), blocked: sum((r) => r.status === "BLOCKED", "count"),
    parts: sum((r) => r.status === "SENT", "parts"), spend: sum((r) => r.status === "SENT", "cost"),
    byKind: Object.fromEntries([...new Set(g.map((r) => r.kind))].map((k) => [k, sum((r) => r.kind === k && r.status === "SENT", "count")])),
  };
}
