import { randomBytes } from "node:crypto";
import { prisma } from "../../db";
import { conflict, notFound } from "../../http/errors";
import { changePlan } from "../../platform/modules/service";
import { createTenant } from "../../platform/tenants";

const COLORS = ["#b5476b", "#b98d3f", "#4b8a70", "#4a7fb0", "#8a5fb0", "#c07a1c", "#3a8f9a"];
const newSlug = () => `s-${randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8).padEnd(8, "x")}`;

/**
 * Turns a paid finder listing into a real salon: tenant on the listing's plan (with its modules and a paid-through
 * date), an OWNER login on the listing's phone, and bookable staff. Everything happens in one transaction.
 * Idempotent: a listing that already has a salon just gets its subscription extended.
 */
export async function provisionFromListing(listingId: string, months: number): Promise<{ tenantId: string; slug: string | null }> {
  const listing = await prisma.finderListing.findUnique({ where: { id: listingId }, include: { plan: true, staff: true } });
  if (!listing) throw notFound("پروفایل پیدا نشد");

  if (listing.tenantId) {
    await changePlan(listing.tenantId, listing.plan.code, months);
    return { tenantId: listing.tenantId, slug: null };
  }
  if (await prisma.user.findUnique({ where: { phone: listing.phone } })) throw conflict("این شماره قبلاً در سامانه حساب دارد", "PHONE_TAKEN");

  return prisma.$transaction(async (tx) => {
    let tenant: { id: string; slug: string } | null = null;
    for (let i = 0; i < 5 && !tenant; i++) {
      try { tenant = await createTenant({ name: listing.brand || listing.name, slug: newSlug(), city: listing.city, planCode: listing.plan.code, months }, tx); }
      catch (e) { if (!(e instanceof Error && "code" in e && (e as { code?: string }).code === "SLUG_TAKEN")) throw e; }
    }
    if (!tenant) throw conflict("ساخت نشانی سالن ممکن نشد؛ دوباره تلاش کنید", "SLUG_TAKEN");

    await tx.user.create({ data: { phone: listing.phone, name: listing.name, role: "OWNER", tenantId: tenant.id } });

    // Salon plan: each listed person becomes bookable staff; otherwise (artist) the owner is the one staff member.
    const people = listing.plan.code === "salon" && listing.staff.length ? listing.staff.map((s) => ({ finderStaffId: s.id, name: s.name })) : [{ finderStaffId: null as string | null, name: listing.name }];
    for (const [i, p] of people.entries()) {
      const staff = await tx.staff.create({ data: { tenantId: tenant.id, name: p.name, color: COLORS[i % COLORS.length], listed: true } });
      if (p.finderStaffId) await tx.finderStaff.update({ where: { id: p.finderStaffId }, data: { staffId: staff.id } });
    }
    await tx.finderListing.update({ where: { id: listing.id }, data: { tenantId: tenant.id } });
    return { tenantId: tenant.id, slug: tenant.slug };
  });
}
