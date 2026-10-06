import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import { badRequest, conflict, forbidden, notFound } from "../../http/errors";
import { startListingPayment } from "../../platform/payments/service";
import type { ListingBody } from "./schemas";

// Unambiguous alphabet (no 0/O/1/I) — the code is read aloud / typed from a screenshot.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newEditCode(): string {
  return Array.from(randomBytes(10), (b) => ALPHABET[b % ALPHABET.length]).join("");
}
const hash = (code: string) => createHash("sha256").update(code.trim().toUpperCase()).digest("hex");

function codeMatches(stored: string, given: string): boolean {
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hash(given), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

type PlanLimits = { staff?: number; leads?: boolean; dashboard?: boolean; directBooking?: boolean };
const limitsOf = (json: unknown): PlanLimits => (json && typeof json === "object" ? (json as PlanLimits) : {});

function assertStaffFitsPlan(planCode: string, limits: PlanLimits, staffCount: number) {
  if (planCode !== "salon" && staffCount > 0) throw badRequest("فهرست متخصص فقط برای پلن سالن است");
  if (staffCount > (limits.staff ?? 1)) throw conflict(`این پلن حداکثر ${limits.staff} متخصص دارد`, "PLAN_LIMIT", { feature: "staff", limit: limits.staff });
}

export async function createListing(body: ListingBody & { plan: string }) {
  const plan = await prisma.plan.findUnique({ where: { code: body.plan } });
  if (!plan || !plan.active) throw badRequest("پلن نامعتبر است");
  assertStaffFitsPlan(plan.code, limitsOf(plan.limits), body.staff.length);
  const editCode = newEditCode();
  const listing = await prisma.finderListing.create({
    data: {
      editCodeHash: hash(editCode), planId: plan.id, name: body.name, brand: body.brand ?? body.name, phone: body.phone, city: body.city,
      x: body.x, y: body.y, cats: body.cats, bio: body.bio,
      staff: { create: body.staff.map((s) => ({ name: s.name, cats: s.cats })) },
    },
    select: { id: true, status: true },
  });
  // The plaintext code is returned exactly once; only its hash is stored.
  return { id: listing.id, editCode, status: listing.status };
}

async function summaries(ids: string[]) {
  const rows = await prisma.finderReview.groupBy({ by: ["listingId"], where: { listingId: { in: ids } }, _avg: { rating: true }, _count: true });
  return new Map(rows.map((r) => [r.listingId, { rating: Math.round((r._avg.rating ?? 0) * 10) / 10, reviewCount: r._count }]));
}

const publicSelect = {
  id: true, name: true, brand: true, phone: true, city: true, x: true, y: true, cats: true, bio: true, createdAt: true, tenantId: true,
  plan: { select: { code: true, limits: true } },
  staff: { select: { id: true, name: true, cats: true } },
  tenant: { select: { slug: true, status: true, subscription: { select: { status: true, expiresAt: true } } } },
} satisfies Prisma.FinderListingSelect;
type PublicRow = Prisma.FinderListingGetPayload<{ select: typeof publicSelect }>;

const subscriptionLive = (s: { status: string; expiresAt: Date | null } | null | undefined) => !!s && (s.status === "ACTIVE" || s.status === "TRIAL") && (!s.expiresAt || s.expiresAt.getTime() > Date.now());

/**
 * A provisioned salon's dashboard is the source of truth for its people: the map shows its active, listed staff
 * (with the booking ids), not the snapshot from signup. Listings without a salon keep their signup staff.
 */
async function liveStaff(rows: PublicRow[]) {
  const ids = rows.filter((r) => r.tenantId).map((r) => r.tenantId!);
  const out = new Map<string, { id: string; name: string; cats: string[] }[]>();
  if (!ids.length) return out;
  const staff = await prisma.staff.findMany({
    where: { tenantId: { in: ids }, active: true, listed: true }, orderBy: { createdAt: "asc" },
    select: { id: true, name: true, tenantId: true, services: { select: { service: { select: { category: true } } } } },
  });
  for (const s of staff) {
    const cats = [...new Set(s.services.map((x) => x.service.category))];
    (out.get(s.tenantId) ?? out.set(s.tenantId, []).get(s.tenantId)!).push({ id: s.id, name: s.name, cats });
  }
  return out;
}

async function toPublic(rows: PublicRow[]) {
  const live = await liveStaff(rows);
  return rows.map((r) => {
    const { tenant, tenantId, plan, staff, ...rest } = r;
    const active = !!tenantId && !!tenant && tenant.status === "ACTIVE" && subscriptionLive(tenant.subscription);
    const direct = active && limitsOf(plan.limits).directBooking === true;
    const people = active ? (live.get(tenantId!) ?? []).map((p) => ({ id: p.id, name: p.name, cats: p.cats.length ? p.cats : r.cats, bookingStaffId: p.id })) : staff.map((p) => ({ ...p, bookingStaffId: null as string | null }));
    return { ...rest, plan: plan.code, staff: people, booking: active && tenant ? { slug: tenant.slug, direct } : null };
  });
}

export async function listPublished(f: { city?: string; cat?: string; q?: string; limit: number }) {
  const where: Prisma.FinderListingWhereInput = { status: "PUBLISHED" };
  if (f.city) where.city = f.city;
  if (f.cat) where.OR = [{ cats: { has: f.cat } }, { staff: { some: { cats: { has: f.cat } } } }];
  if (f.q) where.AND = [{ OR: [{ name: { contains: f.q, mode: "insensitive" } }, { brand: { contains: f.q, mode: "insensitive" } }, { bio: { contains: f.q, mode: "insensitive" } }] }];
  const rows = await prisma.finderListing.findMany({ where, select: publicSelect, orderBy: { createdAt: "desc" }, take: f.limit });
  const [sums, dto] = await Promise.all([summaries(rows.map((r) => r.id)), toPublic(rows)]);
  return dto.map((r) => ({ ...r, ...(sums.get(r.id) ?? { rating: 0, reviewCount: 0 }) }));
}

export async function getPublished(id: string) {
  const row = await prisma.finderListing.findFirst({ where: { id, status: "PUBLISHED" }, select: publicSelect });
  if (!row) throw notFound("پروفایل پیدا نشد");
  const [[dto], sums, reviews] = await Promise.all([
    toPublic([row]),
    summaries([id]),
    prisma.finderReview.findMany({ where: { listingId: id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, name: true, rating: true, text: true, createdAt: true } }),
  ]);
  return { ...dto, ...(sums.get(id) ?? { rating: 0, reviewCount: 0 }), reviews };
}

export async function addReview(listingId: string, r: { name: string; rating: number; text: string }) {
  const exists = await prisma.finderListing.count({ where: { id: listingId, status: "PUBLISHED" } });
  if (!exists) throw notFound("پروفایل پیدا نشد");
  return prisma.finderReview.create({ data: { listingId, ...r }, select: { id: true } });
}

export async function addLead(listingId: string, l: { name: string; phone: string; note: string }) {
  const row = await prisma.finderListing.findFirst({ where: { id: listingId, status: "PUBLISHED" }, include: { plan: true } });
  if (!row) throw notFound("پروفایل پیدا نشد");
  if (!limitsOf(row.plan.limits).leads) throw forbidden("پلن این پروفایل درخواست نوبت را پشتیبانی نمی‌کند", "PLAN_LIMIT", { feature: "leads" });
  return prisma.finderLead.create({ data: { listingId, ...l }, select: { id: true } });
}

async function ownedListing(id: string, code: string | null) {
  const row = await prisma.finderListing.findUnique({ where: { id }, include: { plan: true, staff: true } });
  // Same error for "no such listing" and "wrong code" so ids can't be probed.
  if (!row || !code || !codeMatches(row.editCodeHash, code)) throw forbidden("شناسه یا کد ویرایش درست نیست", "BAD_EDIT_CODE");
  return row;
}

export async function getForOwner(id: string, code: string | null) {
  const row = await ownedListing(id, code);
  const leads = await prisma.finderLead.findMany({ where: { listingId: id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, phone: true, note: true, createdAt: true } });
  const { editCodeHash: _omit, ...safe } = row;
  void _omit;
  const tenant = row.tenantId ? await prisma.tenant.findUnique({ where: { id: row.tenantId }, select: { slug: true, subscription: { select: { status: true, expiresAt: true } } } }) : null;
  const paid = row.plan.priceMonthly > 0;
  return {
    ...safe, plan: row.plan.code, planLimits: row.plan.limits, leads,
    salon: tenant && { slug: tenant.slug, active: subscriptionLive(tenant.subscription), expiresAt: tenant.subscription?.expiresAt ?? null },
    // Paying only makes sense once the listing is live, hasn't got a salon yet, and the phone isn't already someone's account.
    activation: { priceMonthly: row.plan.priceMonthly, available: paid && row.status === "PUBLISHED" && !row.tenantId, reason: !paid ? "FREE_PLAN" : row.tenantId ? "ALREADY_ACTIVE" : row.status !== "PUBLISHED" ? "NOT_PUBLISHED" : null },
  };
}

const replaceStaff = (id: string, staff: ListingBody["staff"]) => [
  prisma.finderStaff.deleteMany({ where: { listingId: id } }),
  prisma.finderStaff.createMany({ data: staff.map((s) => ({ listingId: id, name: s.name, cats: s.cats })) }),
];

export async function submitEdit(id: string, code: string | null, body: ListingBody) {
  const row = await ownedListing(id, code);
  if (!row.tenantId) assertStaffFitsPlan(row.plan.code, limitsOf(row.plan.limits), body.staff.length);
  if (row.status === "PUBLISHED") {
    // Live version stays public until an admin approves the change.
    await prisma.finderListing.update({ where: { id }, data: { pendingEdit: body as unknown as Prisma.InputJsonValue } });
    return { status: row.status, pendingEdit: true };
  }
  await prisma.$transaction([
    prisma.finderListing.update({
      where: { id },
      data: { name: body.name, brand: body.brand ?? body.name, phone: body.phone, city: body.city, x: body.x, y: body.y, cats: body.cats, bio: body.bio, status: "PENDING", rejectReason: null },
    }),
    ...(row.tenantId ? [] : replaceStaff(id, body.staff)),
  ]);
  return { status: "PENDING" as const, pendingEdit: false };
}

// ───────── admin ─────────

export async function adminList(f: { status?: string; pendingEdits?: boolean }) {
  const where: Prisma.FinderListingWhereInput = {};
  if (f.status === "PENDING" || f.status === "PUBLISHED" || f.status === "REJECTED") where.status = f.status;
  if (f.pendingEdits) where.pendingEdit = { not: Prisma.DbNull };
  const rows = await prisma.finderListing.findMany({
    where, orderBy: { createdAt: "desc" }, take: 200,
    select: { ...publicSelect, status: true, rejectReason: true, pendingEdit: true, updatedAt: true, plan: { select: { code: true, title: true } }, _count: { select: { leads: true, reviews: true } } },
  });
  return rows.map(({ _count, plan, ...r }) => ({ ...r, plan: plan.code, planTitle: plan.title, leadCount: _count.leads, reviewCount: _count.reviews }));
}

export async function approve(id: string) {
  const row = await prisma.finderListing.findUnique({ where: { id } });
  if (!row) throw notFound();
  const edit = row.pendingEdit as ListingBody | null;
  if (edit) {
    await prisma.$transaction([
      prisma.finderListing.update({
        where: { id },
        data: { name: edit.name, brand: edit.brand ?? edit.name, phone: edit.phone, city: edit.city, x: edit.x, y: edit.y, cats: edit.cats, bio: edit.bio, pendingEdit: Prisma.DbNull, status: "PUBLISHED", rejectReason: null },
      }),
      ...(row.tenantId ? [] : replaceStaff(id, edit.staff ?? [])), // a provisioned salon's people live in its dashboard
    ]);
    return { applied: "edit" as const };
  }
  await prisma.finderListing.update({ where: { id }, data: { status: "PUBLISHED", rejectReason: null } });
  return { applied: "listing" as const };
}

/** A pending edit is rejected on its own (live profile stays); otherwise the listing itself is rejected. */
export async function reject(id: string, reason: string) {
  const row = await prisma.finderListing.findUnique({ where: { id } });
  if (!row) throw notFound();
  if (row.pendingEdit) {
    await prisma.finderListing.update({ where: { id }, data: { pendingEdit: Prisma.DbNull, rejectReason: reason || null } });
    return { rejected: "edit" as const };
  }
  await prisma.finderListing.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason || "بدون دلیل ثبت‌شده" } });
  return { rejected: "listing" as const };
}

export async function unpublish(id: string, reason: string) {
  const row = await prisma.finderListing.findUnique({ where: { id } });
  if (!row) throw notFound();
  await prisma.finderListing.update({ where: { id }, data: { status: "REJECTED", pendingEdit: Prisma.DbNull, rejectReason: reason || "انتشار لغو شد" } });
}

export async function deleteReview(id: string) {
  await prisma.finderReview.delete({ where: { id } }).catch(() => { throw notFound("نظر پیدا نشد"); });
}


/** Owner pays for the listing's plan; on success the salon (dashboard login, staff, booking) is provisioned. */
export async function startActivation(id: string, code: string | null, months: number) {
  const row = await ownedListing(id, code);
  if (row.plan.priceMonthly <= 0) throw badRequest("پلن رایگان نیازی به فعال‌سازی ندارد");
  if (row.status !== "PUBLISHED") throw conflict("پس از تأیید و انتشار پروفایل می‌توانید پنل را فعال کنید", "NOT_PUBLISHED");
  if (row.tenantId) throw conflict("پنل این پروفایل قبلاً فعال شده است؛ از داخل پنل تمدید کنید", "ALREADY_ACTIVE");
  if (await prisma.user.findUnique({ where: { phone: row.phone } })) throw conflict("این شماره قبلاً در سامانه حساب دارد؛ با پشتیبانی تماس بگیرید", "PHONE_TAKEN");
  return startListingPayment(row, row.plan, months);
}
