import { prisma } from "../../db";
import { notFound } from "../../http/errors";
import { assertStaffIds } from "../staff/service";
import type { ServiceBody } from "./schemas";

// Every query is scoped by the session's tenantId. Staff ids are validated through the staff module.

const withStaff = { staff: { select: { staffId: true } } } as const;
const shape = <T extends { staff: { staffId: string }[] }>({ staff, ...s }: T) => ({ ...s, staffIds: staff.map((x) => x.staffId) });

export async function list(tenantId: string, f: { category?: string; active?: boolean }) {
  const rows = await prisma.service.findMany({
    where: { tenantId, archivedAt: null, ...(f.category ? { category: f.category } : {}), ...(f.active !== undefined ? { active: f.active } : {}) },
    orderBy: [{ category: "asc" }, { name: "asc" }], include: withStaff,
  });
  return rows.map(shape);
}

async function own(tenantId: string, id: string) {
  const s = await prisma.service.findFirst({ where: { id, tenantId, archivedAt: null }, include: withStaff });
  if (!s) throw notFound("خدمت پیدا نشد");
  return s;
}

export const get = async (tenantId: string, id: string) => shape(await own(tenantId, id));

export async function create(tenantId: string, b: ServiceBody) {
  const { staffIds = [], ...data } = b;
  await assertStaffIds(tenantId, staffIds);
  const s = await prisma.service.create({ data: { tenantId, ...data, staff: { create: [...new Set(staffIds)].map((staffId) => ({ staffId })) } }, include: withStaff });
  return shape(s);
}

export async function update(tenantId: string, id: string, p: Partial<ServiceBody>) {
  await own(tenantId, id);
  const { staffIds, ...data } = p;
  if (staffIds) await assertStaffIds(tenantId, staffIds);
  await prisma.$transaction([
    prisma.service.update({ where: { id }, data }),
    ...(staffIds ? [prisma.serviceStaff.deleteMany({ where: { serviceId: id } }), prisma.serviceStaff.createMany({ data: [...new Set(staffIds)].map((staffId) => ({ serviceId: id, staffId })) })] : []),
  ]);
  return get(tenantId, id);
}

export async function setStaff(tenantId: string, id: string, staffIds: string[]) {
  return update(tenantId, id, { staffIds });
}

/** Archived, not deleted: past appointments and visits keep their service name/price. */
export async function archive(tenantId: string, id: string) {
  await own(tenantId, id);
  await prisma.service.update({ where: { id }, data: { archivedAt: new Date(), active: false } });
}

/** For the calendar module: the active staff who can perform a service. */
export async function staffFor(tenantId: string, serviceId: string) {
  const s = await own(tenantId, serviceId);
  return prisma.staff.findMany({ where: { tenantId, active: true, id: { in: s.staff.map((x) => x.staffId) } } });
}
