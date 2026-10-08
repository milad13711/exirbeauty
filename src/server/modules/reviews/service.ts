import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { conflict, notFound } from "../../http/errors";
import { assertModuleActive } from "../../platform/modules/service";
import { sendScenarioText } from "../sms/service";
import { firstNameOf } from "./names";
import { hashToken, newToken, routeFor, stats } from "./rules";

// Every owner query is scoped by tenantId. The public survey page is identified only by the secret in the link.

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export async function getConfig(tenantId: string) {
  return { threshold: (await prisma.reviewConfig.findUnique({ where: { tenantId } }))?.threshold ?? 4 };
}
export async function putConfig(tenantId: string, threshold: number) {
  await prisma.reviewConfig.upsert({ where: { tenantId }, create: { tenantId, threshold }, update: { threshold } });
  return getConfig(tenantId);
}

// ───────── asking for a review (reaction to cashier invoices) ─────────

/** After an invoice with a customer: create the survey and text the link, if the salon has that scenario on. */
export async function onSaleCreated(tenantId: string, p: Record<string, unknown>) {
  const sale = await prisma.sale.findFirst({ where: { id: String(p.id), tenantId }, include: { lines: true, customer: { select: { id: true, name: true, phone: true } } } });
  if (!sale || sale.status === "VOID" || !sale.customer) return;
  const line = sale.lines.find((l) => l.kind === "SERVICE");
  if (!line) return; // only services get a satisfaction survey
  const { token, hash } = newToken();
  try {
    await prisma.review.create({ data: { tenantId, saleId: sale.id, customerId: sale.customer.id, staffId: line.staffId, serviceName: line.name, tokenHash: hash } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return; // already asked for this invoice
    throw e;
  }
  const sent = await sendScenarioText(tenantId, "REVIEW", { customerId: sale.customer.id, phone: sale.customer.phone }, { name: firstNameOf(sale.customer.name), service: line.name, link: `${appUrl()}/r/${token}` }, `review:${sale.id}`);
  // Scenario off (or message not sent): there is no link in anyone's hands, so don't leave a dangling pending survey.
  if (!sent || sent.status !== "SENT") await prisma.review.deleteMany({ where: { tokenHash: hash, rating: null } });
}

// ───────── the public survey page ─────────

async function bySecret(token: string) {
  const r = await prisma.review.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!r) throw notFound("این لینک نظرسنجی معتبر نیست");
  // A salon that switched the module off stops collecting reviews.
  await assertModuleActive(r.tenantId, "reviews").catch(() => { throw notFound("این لینک نظرسنجی معتبر نیست"); });
  return r;
}

export async function publicView(token: string) {
  const r = await bySecret(token);
  const [tenant, staff, cfg] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: r.tenantId }, select: { name: true } }),
    r.staffId ? prisma.staff.findFirst({ where: { id: r.staffId, tenantId: r.tenantId }, select: { name: true } }) : null,
    getConfig(r.tenantId),
  ]);
  return { salon: tenant?.name ?? "", serviceName: r.serviceName, staffName: staff?.name ?? null, answered: r.rating !== null, rating: r.rating, threshold: cfg.threshold };
}

export async function answer(token: string, b: { rating: number; comment: string }) {
  const r = await bySecret(token);
  const cfg = await getConfig(r.tenantId);
  const route = routeFor(b.rating, cfg.threshold);
  // One answer per survey, even if the link is opened twice.
  const claimed = await prisma.review.updateMany({ where: { id: r.id, rating: null }, data: { rating: b.rating, comment: b.comment, route, answeredAt: new Date() } });
  if (claimed.count !== 1) throw conflict("شما قبلاً به این نظرسنجی پاسخ داده‌اید", "ALREADY_ANSWERED");
  return { route, thanks: route === "PUBLIC" ? "از نظر لطف شما سپاسگزاریم!" : "بازخورد شما مستقیم به مدیر سالن رسید و پیگیری می‌شود." };
}

// ───────── the owner's side ─────────

const view = (r: Awaited<ReturnType<typeof ownRow>> & object, names: Map<string, string>) => ({
  id: r.id, rating: r.rating, comment: r.comment, route: r.route, resolved: r.resolved, reply: r.reply, repliedAt: r.repliedAt,
  serviceName: r.serviceName, staffId: r.staffId, staffName: r.staffId ? names.get(r.staffId) ?? null : null, customerName: r.customerId ? names.get(r.customerId) ?? null : null, createdAt: r.createdAt, answeredAt: r.answeredAt,
});
async function ownRow(tenantId: string, id: string) {
  const r = await prisma.review.findFirst({ where: { id, tenantId } });
  if (!r) throw notFound("نظر پیدا نشد");
  return r;
}
async function nameMap(tenantId: string, rows: { staffId: string | null; customerId: string | null }[]) {
  const [staff, customers] = await Promise.all([
    prisma.staff.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.staffId).filter((x): x is string => !!x))] } }, select: { id: true, name: true } }),
    prisma.customer.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.customerId).filter((x): x is string => !!x))] } }, select: { id: true, name: true } }),
  ]);
  return new Map([...staff, ...customers].map((x) => [x.id, x.name]));
}

export async function list(tenantId: string, q: { route?: "PUBLIC" | "PRIVATE"; status?: "answered" | "pending"; limit: number }) {
  const rows = await prisma.review.findMany({
    where: { tenantId, ...(q.route ? { route: q.route } : {}), ...(q.status === "answered" ? { rating: { not: null } } : q.status === "pending" ? { rating: null } : {}) },
    orderBy: { createdAt: "desc" }, take: q.limit,
  });
  const names = await nameMap(tenantId, rows);
  return rows.map((r) => view(r, names));
}

export async function overview(tenantId: string) {
  const [answered, pending] = await Promise.all([
    prisma.review.findMany({ where: { tenantId, rating: { not: null } }, select: { rating: true, staffId: true, route: true, resolved: true } }),
    prisma.review.count({ where: { tenantId, rating: null } }),
  ]);
  const s = stats(answered.map((r) => ({ rating: r.rating!, staffId: r.staffId, route: r.route!, resolved: r.resolved })));
  const names = await nameMap(tenantId, s.byStaff.map((x) => ({ staffId: x.staffId, customerId: null })));
  return { ...s, pending, byStaff: s.byStaff.map((x) => ({ ...x, name: names.get(x.staffId) ?? "—" })) };
}

export async function reply(tenantId: string, id: string, text: string) {
  const r = await ownRow(tenantId, id);
  if (r.rating === null) throw conflict("هنوز به این نظرسنجی پاسخی داده نشده است", "NOT_ANSWERED");
  return view(await prisma.review.update({ where: { id }, data: { reply: text, repliedAt: new Date() } }), await nameMap(tenantId, [r]));
}

export async function resolve(tenantId: string, id: string, resolved: boolean) {
  const r = await ownRow(tenantId, id);
  return view(await prisma.review.update({ where: { id }, data: { resolved } }), await nameMap(tenantId, [r]));
}
