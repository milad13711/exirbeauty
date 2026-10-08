import { prisma } from "../../db";
import { notFound } from "../../http/errors";
import { findOrCreateByPhone } from "../customers/service";
import { normalizePhone } from "../sms/text";

// The salon's public presence on the finder map. Everything is reached through the listing tied to this tenant.

async function listingOf(tenantId: string) {
  return prisma.finderListing.findUnique({ where: { tenantId }, select: { id: true, name: true, city: true, status: true, bio: true, cats: true, createdAt: true } });
}

export async function overview(tenantId: string) {
  const listing = await listingOf(tenantId);
  const [staff, rating, leads] = await Promise.all([
    prisma.staff.findMany({ where: { tenantId, active: true }, select: { id: true, name: true, listed: true } }),
    listing ? prisma.finderReview.aggregate({ where: { listingId: listing.id }, _avg: { rating: true }, _count: true }) : null,
    listing ? prisma.finderLead.count({ where: { listingId: listing.id } }) : 0,
  ]);
  return {
    listing,
    staff: { active: staff.length, listed: staff.filter((s) => s.listed).length },
    rating: { avg: rating?._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : 0, count: rating?._count ?? 0 },
    leads,
  };
}

export async function leads(tenantId: string) {
  const l = await listingOf(tenantId);
  if (!l) return [];
  const rows = await prisma.finderLead.findMany({ where: { listingId: l.id }, orderBy: { createdAt: "desc" }, take: 200 });
  // A lead is "converted" once someone with that phone is a customer of this salon.
  const known = new Map((await prisma.customer.findMany({ where: { tenantId, phone: { in: rows.map((r) => r.phone) } }, select: { id: true, phone: true } })).map((c) => [c.phone, c.id]));
  return rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, note: r.note, createdAt: r.createdAt, customerId: known.get(r.phone) ?? null }));
}

export async function convertLead(tenantId: string, leadId: string) {
  const l = await listingOf(tenantId);
  const lead = l ? await prisma.finderLead.findFirst({ where: { id: leadId, listingId: l.id } }) : null;
  if (!lead) throw notFound("درخواست پیدا نشد");
  const phone = normalizePhone(lead.phone) ?? lead.phone;
  const c = await findOrCreateByPhone(tenantId, lead.name, phone, "مارکت‌پلیس");
  return { customerId: c.id };
}

export async function reviews(tenantId: string) {
  const l = await listingOf(tenantId);
  if (!l) return [];
  return prisma.finderReview.findMany({ where: { listingId: l.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, rating: true, text: true, createdAt: true } });
}
