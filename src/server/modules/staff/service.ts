import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, notFound } from "../../http/errors";
import { assertWithinLimit } from "../../platform/limits";
import { checkSchedule, type StaffBody } from "./schemas";

// Every query is scoped by the session's tenantId.

const activeCount = (tenantId: string) => prisma.staff.count({ where: { tenantId, active: true } });
const day = (s: string) => new Date(`${s}T00:00:00.000Z`);

export async function list(tenantId: string, includeInactive: boolean) {
  return prisma.staff.findMany({ where: { tenantId, ...(includeInactive ? {} : { active: true }) }, orderBy: [{ active: "desc" }, { createdAt: "asc" }], include: { user: { select: { phone: true } } } })
    .then((rows) => rows.map(({ user, ...s }) => ({ ...s, loginPhone: user?.phone ?? null })));
}

async function own(tenantId: string, id: string) {
  const s = await prisma.staff.findFirst({ where: { id, tenantId } });
  if (!s) throw notFound("متخصص پیدا نشد");
  return s;
}

export async function get(tenantId: string, id: string) {
  const s = await own(tenantId, id);
  const [leaves, services, user] = await Promise.all([
    prisma.staffLeave.findMany({ where: { tenantId, staffId: id }, orderBy: { fromDate: "desc" }, take: 50 }),
    prisma.serviceStaff.findMany({ where: { staffId: id, service: { tenantId, archivedAt: null } }, select: { service: { select: { id: true, name: true } } } }),
    s.userId ? prisma.user.findUnique({ where: { id: s.userId }, select: { phone: true } }) : null,
  ]);
  return { ...s, leaves, services: services.map((x) => x.service), loginPhone: user?.phone ?? null };
}

export async function create(tenantId: string, b: StaffBody) {
  const bad = checkSchedule(b);
  if (bad) throw badRequest(bad);
  if (b.active) await assertWithinLimit(tenantId, "staff", await activeCount(tenantId));
  return prisma.staff.create({ data: { tenantId, ...b, breaks: b.breaks as Prisma.InputJsonValue } });
}

export async function update(tenantId: string, id: string, p: Partial<StaffBody>) {
  const cur = await own(tenantId, id);
  const merged = { startMin: p.startMin ?? cur.startMin, endMin: p.endMin ?? cur.endMin, breaks: p.breaks ?? (cur.breaks as StaffBody["breaks"]) };
  const bad = checkSchedule(merged);
  if (bad) throw badRequest(bad);
  if (p.active === true && !cur.active) await assertWithinLimit(tenantId, "staff", await activeCount(tenantId)); // re-activation counts too
  const { breaks, ...rest } = p;
  return prisma.staff.update({ where: { id }, data: { ...rest, ...(breaks ? { breaks: breaks as Prisma.InputJsonValue } : {}) } });
}

/** Staff are deactivated, not deleted: appointments, history and commissions keep pointing at them. */
export async function deactivate(tenantId: string, id: string) {
  await own(tenantId, id);
  await prisma.staff.update({ where: { id }, data: { active: false } });
}

export async function addLeave(tenantId: string, staffId: string, l: { fromDate: string; toDate: string; reason: string }) {
  await own(tenantId, staffId);
  return prisma.staffLeave.create({ data: { tenantId, staffId, fromDate: day(l.fromDate), toDate: day(l.toDate), reason: l.reason } });
}

export async function deleteLeave(tenantId: string, staffId: string, leaveId: string) {
  const r = await prisma.staffLeave.deleteMany({ where: { id: leaveId, staffId, tenantId } });
  if (!r.count) throw notFound("مرخصی پیدا نشد");
}

/** Gives a staff member an OTP login (role STAFF) in this tenant. A number that belongs to another salon can't be taken. */
export async function invite(tenantId: string, staffId: string, phone: string) {
  const s = await own(tenantId, staffId);
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && existing.tenantId !== tenantId) throw conflict("این شماره قبلاً در سامانه ثبت شده است", "PHONE_TAKEN");
  if (existing && existing.role !== "STAFF") throw conflict("این شماره مالک یا مدیر است و نمی‌تواند به‌عنوان پرسنل متصل شود", "PHONE_TAKEN");
  if (existing && (await prisma.staff.count({ where: { userId: existing.id, id: { not: staffId } } }))) throw conflict("این شماره به متخصص دیگری وصل است", "PHONE_TAKEN");
  const user = existing ?? (await prisma.user.create({ data: { phone, name: s.name, role: "STAFF", tenantId } }));
  if (s.userId && s.userId !== user.id) await prisma.staff.update({ where: { id: staffId }, data: { userId: null } });
  await prisma.staff.update({ where: { id: staffId }, data: { userId: user.id } });
  return { loginPhone: phone };
}

/** Used by other modules (services, calendar) to validate staff ids belong to the tenant. */
export async function assertStaffIds(tenantId: string, ids: string[]) {
  if (!ids.length) return;
  const found = await prisma.staff.count({ where: { tenantId, id: { in: ids } } });
  if (found !== new Set(ids).size) throw badRequest("یکی از متخصص‌ها پیدا نشد");
}
