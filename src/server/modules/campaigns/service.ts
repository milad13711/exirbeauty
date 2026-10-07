import type { Campaign } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import { assertModuleActive } from "../../platform/modules/service";
import { addDays, instantOf, tehranNow } from "../calendar/availability";
import { account, getPricing, sendSms } from "../sms/service";
import { parts, render } from "../sms/text";
import { firstName, hasFilter, jalaliMonth, matches, type Facts, type Segment } from "./audience";

// Every query is scoped by tenantId. Sending goes through the SMS module (credit, charging, refunds, once-only sends).

const MAX_AUDIENCE = 500; // one campaign sends synchronously; larger lists need a background queue
const FREQUENCY_CAP = 2; // campaign messages per customer per rolling 30 days
const ATTRIBUTION_DAYS = 5;
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

type Person = { id: string; name: string; phone: string };

/** Everyone who matches the segment, with the facts the rules need gathered in a few queries (not one per customer). */
export async function audience(tenantId: string, seg: Segment, now = tehranNow()): Promise<Person[]> {
  if (!hasFilter(seg)) throw badRequest("حداقل یک شرط برای انتخاب مخاطب تعیین کنید");
  if (seg.tiers?.length) await assertModuleActive(tenantId, "loyalty").catch(() => { throw badRequest("فیلتر سطح باشگاه به ماژول باشگاه مشتریان نیاز دارد"); });
  const customers = await prisma.customer.findMany({ where: { tenantId, archivedAt: null }, select: { id: true, name: true, phone: true, birthDate: true }, take: 5000 });
  const ids = customers.map((c) => c.id);

  const [visits, spent, tiers] = await Promise.all([
    prisma.customerVisit.findMany({ where: { tenantId, customerId: { in: ids } }, select: { customerId: true, at: true, service: true } }),
    prisma.sale.groupBy({ by: ["customerId"], where: { tenantId, status: { not: "VOID" }, customerId: { in: ids } }, _sum: { total: true } }),
    seg.tiers?.length ? prisma.loyaltyAccount.findMany({ where: { tenantId }, select: { customerId: true, tier: true } }) : Promise.resolve([]),
  ]);
  const last = new Map<string, number>(), svc = new Map<string, Set<string>>();
  for (const v of visits) {
    last.set(v.customerId, Math.max(last.get(v.customerId) ?? 0, v.at.getTime()));
    (svc.get(v.customerId) ?? svc.set(v.customerId, new Set()).get(v.customerId)!).add(v.service);
  }
  const total = new Map(spent.map((s) => [s.customerId, s._sum.total ?? 0]));
  const tier = new Map(tiers.map((t) => [t.customerId, t.tier]));
  const todayMs = day(now.date).getTime(), month = jalaliMonth(day(now.date));

  return customers.filter((c) => {
    const lv = last.get(c.id);
    const facts: Facts = {
      daysSinceVisit: lv === undefined ? null : Math.floor((todayMs - lv) / 86_400_000),
      totalSpent: total.get(c.id) ?? 0, tier: tier.get(c.id) ?? null, services: svc.get(c.id) ?? new Set(), birthMonth: c.birthDate ? jalaliMonth(c.birthDate) : null,
    };
    return matches(facts, seg, { month });
  }).map(({ id, name, phone }) => ({ id, name, phone }));
}

const sample = (message: string, name = "سارا") => render(message, { name });

export async function preview(tenantId: string, seg: Segment, message: string) {
  const people = await audience(tenantId, seg);
  const sell = (await getPricing()).sell, acc = await account(tenantId);
  const cost = people.length * parts(sample(message, firstName(people[0]?.name ?? "سارا"))) * sell;
  return { count: people.length, tooMany: people.length > MAX_AUDIENCE, sample: people.slice(0, 5).map((p) => p.name), cost, balance: acc.balance, enough: acc.balance >= cost, text: sample(message, firstName(people[0]?.name ?? "سارا")) };
}

// ───────── sending ─────────

async function deliver(c: Campaign) {
  const seg = c.segment as Segment;
  const people = await audience(c.tenantId, seg);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const recent = await prisma.smsMessage.groupBy({ by: ["customerId"], where: { tenantId: c.tenantId, kind: "CAMPAIGN", status: "SENT", createdAt: { gte: since }, customerId: { in: people.map((p) => p.id) } }, _count: true });
  const heard = new Map(recent.map((r) => [r.customerId, r._count]));
  let sent = 0, failed = 0, skipped = 0;
  for (const p of people) {
    if ((heard.get(p.id) ?? 0) >= FREQUENCY_CAP) { skipped++; continue; }
    const r = await sendSms(c.tenantId, { customerId: p.id, phone: p.phone, text: render(c.message, { name: firstName(p.name) }), kind: "CAMPAIGN", relatedId: `${c.id}:${p.id}` });
    if (r.status === "SENT") sent++; else if (r.status === "FAILED") failed++; else skipped++; // BLOCKED (no credit) / DUPLICATE
  }
  return prisma.campaign.update({ where: { id: c.id }, data: { status: "SENT", sentAt: new Date(), audienceCount: people.length, sentCount: sent, failedCount: failed, skippedCount: skipped } });
}

export async function create(tenantId: string, b: { name: string; message: string; segment: Segment; sendAt?: { date: string; minute: number } }) {
  const p = await preview(tenantId, b.segment, b.message);
  if (!p.count) throw badRequest("هیچ مشتری با این شرایط پیدا نشد");
  if (p.tooMany) throw conflict(`مخاطب بیش از ${MAX_AUDIENCE} نفر است؛ شرط‌ها را محدودتر کنید`, "AUDIENCE_TOO_LARGE", { count: p.count });
  if (!p.enough) throw conflict("اعتبار پیامک برای این کمپین کافی نیست؛ ابتدا شارژ کنید", "NO_CREDIT", { cost: p.cost, balance: p.balance });

  if (b.sendAt) {
    const when = instantOf(b.sendAt.date, b.sendAt.minute);
    if (when.getTime() <= Date.now()) throw badRequest("زمان ارسال باید در آینده باشد");
    if (b.sendAt.date > addDays(tehranNow().date, 60)) throw badRequest("زمان‌بندی بیش از ۶۰ روز آینده ممکن نیست");
    return view(await prisma.campaign.create({ data: { tenantId, name: b.name, message: b.message, segment: b.segment, status: "SCHEDULED", scheduledFor: when, audienceCount: p.count } }));
  }
  const c = await prisma.campaign.create({ data: { tenantId, name: b.name, message: b.message, segment: b.segment, status: "SENDING", audienceCount: p.count } });
  return view(await deliver(c));
}

/** Sends campaigns whose time has come. Each is claimed first, so overlapping runs never send one twice. */
export async function runScheduled(now = new Date()) {
  const due = await prisma.campaign.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: now } }, take: 20 });
  let sent = 0, failed = 0;
  for (const c of due) {
    const claimed = await prisma.campaign.updateMany({ where: { id: c.id, status: "SCHEDULED" }, data: { status: "SENDING" } });
    if (claimed.count !== 1) continue;
    try {
      await assertModuleActive(c.tenantId, "campaigns");
      await deliver(c); sent++;
    } catch (e) {
      console.error("[campaigns] scheduled send failed", c.id, e);
      await prisma.campaign.update({ where: { id: c.id }, data: { status: "CANCELED" } });
      failed++;
    }
  }
  return { sent, failed };
}

export async function cancel(tenantId: string, id: string) {
  const r = await prisma.campaign.updateMany({ where: { id, tenantId, status: "SCHEDULED" }, data: { status: "CANCELED" } });
  if (r.count !== 1) {
    if (!(await prisma.campaign.count({ where: { id, tenantId } }))) throw notFound("کمپین پیدا نشد");
    throw conflict("فقط کمپین زمان‌بندی‌شده قابل لغو است", "NOT_SCHEDULED");
  }
}

// ───────── history ─────────

const view = (c: Campaign, attributed?: { revenue: number; buyers: number }) => ({
  id: c.id, name: c.name, message: c.message, segment: c.segment as Segment, status: c.status, scheduledFor: c.scheduledFor, sentAt: c.sentAt,
  audienceCount: c.audienceCount, sentCount: c.sentCount, failedCount: c.failedCount, skippedCount: c.skippedCount, createdAt: c.createdAt, ...(attributed ?? {}),
});

/** Sales a recipient made within a few days after the campaign reached them. */
export async function list(tenantId: string) {
  const rows = await prisma.campaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 50 });
  const out = [];
  for (const c of rows) {
    let attributed = { revenue: 0, buyers: 0 };
    if (c.status === "SENT" && c.sentAt && c.sentCount) {
      const msgs = await prisma.smsMessage.findMany({ where: { tenantId, kind: "CAMPAIGN", status: "SENT", relatedId: { startsWith: `${c.id}:` } }, select: { customerId: true } });
      const ids = [...new Set(msgs.map((m) => m.customerId).filter((x): x is string => !!x))];
      const from = tehranNow(c.sentAt).date;
      const sales = ids.length ? await prisma.sale.findMany({ where: { tenantId, customerId: { in: ids }, status: { not: "VOID" }, date: { gte: day(from), lte: day(addDays(from, ATTRIBUTION_DAYS)) } }, select: { customerId: true, total: true } }) : [];
      attributed = { revenue: sales.reduce((a, s) => a + s.total, 0), buyers: new Set(sales.map((s) => s.customerId)).size };
    }
    out.push(view(c, attributed));
  }
  return out;
}
