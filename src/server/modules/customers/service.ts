import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import type { CustomerBody } from "./schemas";

// Every query below is scoped by tenantId taken from the session (never from the request body/URL),
// so one salon can never read or change another salon's customers.

const date = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00.000Z`) : s === null ? null : undefined);

const summarySelect = { id: true, name: true, phone: true, gender: true, tags: true, source: true, createdAt: true, birthDate: true } satisfies Prisma.CustomerSelect;

export async function list(tenantId: string, f: { q?: string; tag?: string; cursor?: string; limit: number }) {
  const where: Prisma.CustomerWhereInput = { tenantId, archivedAt: null };
  if (f.tag) where.tags = { has: f.tag };
  if (f.q) {
    const q = f.q.replace(/[\s-]/g, "");
    where.OR = [{ name: { contains: f.q, mode: "insensitive" } }, ...(/^\d+$/.test(q) ? [{ phone: { contains: q } }] : [])];
  }
  const rows = await prisma.customer.findMany({
    where, select: summarySelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: f.limit + 1,
    ...(f.cursor ? { cursor: { id: f.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > f.limit;
  const items = hasMore ? rows.slice(0, f.limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null, ...(f.cursor ? {} : { total: await prisma.customer.count({ where }) }) };
}

async function own(tenantId: string, id: string) {
  const c = await prisma.customer.findFirst({ where: { id, tenantId, archivedAt: null } });
  if (!c) throw notFound("مشتری پیدا نشد");
  return c;
}

export async function get(tenantId: string, id: string) {
  const c = await own(tenantId, id);
  const visits = await prisma.customerVisit.findMany({ where: { tenantId, customerId: id }, orderBy: { at: "desc" }, take: 50 });
  const stats = await prisma.customerVisit.aggregate({ where: { tenantId, customerId: id }, _count: true, _sum: { price: true }, _max: { at: true } });
  return { ...c, visits, stats: { visitCount: stats._count, totalSpent: stats._sum.price ?? 0, lastVisitAt: stats._max.at } };
}

async function assertReferrer(tenantId: string, referredById: string | null | undefined, selfId?: string) {
  if (!referredById) return;
  if (referredById === selfId) throw badRequest("مشتری نمی‌تواند معرف خودش باشد");
  if (!(await prisma.customer.count({ where: { id: referredById, tenantId } }))) throw badRequest("معرف پیدا نشد");
}

function phoneTaken(e: unknown): never | void {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("این شماره قبلاً برای مشتری دیگری ثبت شده", "PHONE_TAKEN");
  throw e;
}

export async function create(tenantId: string, b: CustomerBody) {
  await assertReferrer(tenantId, b.referredById);
  // An archived customer with this phone is restored instead of colliding with the unique index.
  const archived = await prisma.customer.findFirst({ where: { tenantId, phone: b.phone, archivedAt: { not: null } } });
  const data = { name: b.name, gender: b.gender, birthDate: date(b.birthDate), note: b.note, tags: b.tags, allergies: b.allergies, occasions: b.occasions, beauty: b.beauty as Prisma.InputJsonValue, source: b.source, referredById: b.referredById ?? null };
  try {
    return archived
      ? await prisma.customer.update({ where: { id: archived.id }, data: { ...data, archivedAt: null }, select: summarySelect })
      : await prisma.customer.create({ data: { tenantId, phone: b.phone, ...data }, select: summarySelect });
  } catch (e) { return phoneTaken(e); }
}

export async function update(tenantId: string, id: string, p: Partial<CustomerBody>) {
  await own(tenantId, id);
  if (p.referredById !== undefined) await assertReferrer(tenantId, p.referredById, id);
  const { birthDate, beauty, referredById, ...rest } = p;
  try {
    return await prisma.customer.update({
      where: { id },
      data: { ...rest, ...(birthDate !== undefined ? { birthDate: date(birthDate) } : {}), ...(beauty ? { beauty: beauty as Prisma.InputJsonValue } : {}), ...(referredById !== undefined ? { referredById } : {}) },
      select: summarySelect,
    });
  } catch (e) { return phoneTaken(e); }
}

export async function archive(tenantId: string, id: string) {
  await own(tenantId, id);
  await prisma.customer.update({ where: { id }, data: { archivedAt: new Date() } });
}

export async function addVisit(tenantId: string, customerId: string, v: { at: string; service: string; category: string; staffName: string; price: number; note: string }) {
  await own(tenantId, customerId);
  return prisma.customerVisit.create({ data: { tenantId, customerId, ...v, at: new Date(v.at) } });
}

export async function deleteVisit(tenantId: string, customerId: string, visitId: string) {
  const r = await prisma.customerVisit.deleteMany({ where: { id: visitId, customerId, tenantId } });
  if (r.count === 0) throw notFound("سابقه پیدا نشد");
}

/** Bulk import (e.g. from Excel). Existing phones are skipped, never overwritten; a report says what happened per row. */
export async function importRows(tenantId: string, rows: { name: string; phone: string; gender?: CustomerBody["gender"]; note?: string; tags?: string[]; birthDate?: string | null }[]) {
  const seen = new Set<string>();
  const existing = new Set((await prisma.customer.findMany({ where: { tenantId, phone: { in: rows.map((r) => r.phone) } }, select: { phone: true } })).map((c) => c.phone));
  const fresh: typeof rows = [];
  const skipped: { row: number; phone: string; reason: "EXISTS" | "DUPLICATE_IN_FILE" }[] = [];
  rows.forEach((r, i) => {
    if (existing.has(r.phone)) skipped.push({ row: i + 1, phone: r.phone, reason: "EXISTS" });
    else if (seen.has(r.phone)) skipped.push({ row: i + 1, phone: r.phone, reason: "DUPLICATE_IN_FILE" });
    else { seen.add(r.phone); fresh.push(r); }
  });
  if (fresh.length) {
    await prisma.customer.createMany({
      data: fresh.map((r) => ({ tenantId, name: r.name, phone: r.phone, gender: r.gender ?? "FEMALE", note: r.note ?? "", tags: r.tags ?? ["وارد شده"], birthDate: date(r.birthDate) ?? null, source: "import" })),
      skipDuplicates: true,
    });
  }
  return { created: fresh.length, skipped };
}
