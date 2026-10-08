import type { ContentPost } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, notFound } from "../../http/errors";
import { tehranNow } from "../calendar/availability";
import { jalaliMonth } from "../campaigns/audience";
import { dueToday, normalize, type Status } from "./rules";

// Every query is scoped by tenantId. Posts are a planning calendar: publishing happens on the salon's own social accounts.

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const view = (p: ContentPost) => ({ id: p.id, kind: p.kind, caption: p.caption, tags: p.tags, service: p.service, status: p.status, scheduledFor: p.scheduledFor ? ymd(p.scheduledFor) : null, publishedAt: p.publishedAt, createdAt: p.createdAt });

/** What the caption generator needs: salon name, services on offer, and who has a birthday this (Jalali) month. */
export async function context(tenantId: string) {
  const month = jalaliMonth(day(tehranNow().date));
  const [tenant, services, birthdays] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }),
    prisma.service.findMany({ where: { tenantId, active: true, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
    prisma.customer.findMany({ where: { tenantId, archivedAt: null, birthDate: { not: null } }, select: { birthDate: true } }),
  ]);
  return { salon: tenant.name, services, birthdaysThisMonth: birthdays.filter((c) => jalaliMonth(c.birthDate!) === month).length, month };
}

export async function list(tenantId: string) {
  const rows = await prisma.contentPost.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 200 });
  const today = tehranNow().date;
  const posts = rows.map(view);
  return { posts, due: dueToday(posts.map((p) => ({ status: p.status as Status, scheduledFor: p.scheduledFor })), today) };
}

export async function create(tenantId: string, b: { kind: ContentPost["kind"]; caption: string; tags: string[]; service?: string | null; status: Status; scheduledFor?: string | null }) {
  const n = normalize(b.status, b.scheduledFor, tehranNow().date);
  if (!n.ok) throw badRequest(n.error);
  return view(await prisma.contentPost.create({ data: { tenantId, kind: b.kind, caption: b.caption, tags: b.tags, service: b.service ?? null, status: b.status, scheduledFor: n.scheduledFor ? day(n.scheduledFor) : null, publishedAt: b.status === "PUBLISHED" ? new Date() : null } }));
}

export async function update(tenantId: string, id: string, b: { caption?: string; tags?: string[]; service?: string | null; status?: Status; scheduledFor?: string | null }) {
  const p = await prisma.contentPost.findFirst({ where: { id, tenantId } });
  if (!p) throw notFound("پست پیدا نشد");
  const status = b.status ?? (p.status as Status);
  const n = normalize(status, b.scheduledFor !== undefined ? b.scheduledFor : p.scheduledFor ? ymd(p.scheduledFor) : null, tehranNow().date);
  if (!n.ok) throw badRequest(n.error);
  return view(await prisma.contentPost.update({ where: { id }, data: {
    ...(b.caption !== undefined ? { caption: b.caption } : {}), ...(b.tags !== undefined ? { tags: b.tags } : {}), ...(b.service !== undefined ? { service: b.service } : {}),
    status, scheduledFor: n.scheduledFor ? day(n.scheduledFor) : null, publishedAt: status === "PUBLISHED" ? p.publishedAt ?? new Date() : null,
  } }));
}

export async function remove(tenantId: string, id: string) {
  const r = await prisma.contentPost.deleteMany({ where: { id, tenantId } });
  if (!r.count) throw notFound("پست پیدا نشد");
}
