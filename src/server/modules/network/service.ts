import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { conflict, notFound } from "../../http/errors";
import { CATEGORIES, canAdvance, type Status } from "./catalog";

const view = (r: { id: string; category: string; note: string; status: string; response: string | null; createdAt: Date; updatedAt: Date }) =>
  ({ id: r.id, category: r.category, note: r.note, status: r.status, response: r.response, createdAt: r.createdAt, updatedAt: r.updatedAt });

export const catalog = () => CATEGORIES;

export async function mine(tenantId: string) {
  return (await prisma.networkRequest.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 })).map(view);
}

/** One open request per category: a second click can't flood the platform team (also a partial unique index). */
export async function request(tenantId: string, b: { category: string; note: string }) {
  try {
    return view(await prisma.networkRequest.create({ data: { tenantId, ...b } }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw conflict("درخواست قبلی شما برای این دسته هنوز در دست بررسی است", "ALREADY_OPEN");
    throw e;
  }
}

// ───────── platform team ─────────

export async function adminList(status?: Status) {
  const rows = await prisma.networkRequest.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  const names = new Map((await prisma.tenant.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.tenantId))] } }, select: { id: true, name: true, city: true } })).map((t) => [t.id, t]));
  return rows.map((r) => ({ ...view(r), tenantId: r.tenantId, salon: names.get(r.tenantId)?.name ?? "—", city: names.get(r.tenantId)?.city ?? "" }));
}

export async function adminUpdate(id: string, b: { status: "REVIEWING" | "ANSWERED"; response?: string }) {
  const r = await prisma.networkRequest.findUnique({ where: { id } });
  if (!r) throw notFound("درخواست پیدا نشد");
  if (!canAdvance(r.status, b.status)) throw conflict("وضعیت درخواست فقط به جلو می‌رود", "BAD_TRANSITION", { from: r.status, to: b.status });
  // Claim the transition so two admins answering at once can't both apply.
  const claimed = await prisma.networkRequest.updateMany({ where: { id, status: r.status }, data: { status: b.status, ...(b.response !== undefined ? { response: b.response } : {}) } });
  if (claimed.count !== 1) throw conflict("وضعیت درخواست همین الان تغییر کرد", "STALE");
  return view(await prisma.networkRequest.findUniqueOrThrow({ where: { id } }));
}
