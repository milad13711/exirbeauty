import { prisma } from "../../db";
import { HttpError, conflict, notFound, unauthorized } from "../../http/errors";
import type { Session } from "../../http/types";
import { checkCode, createCode } from "../../platform/auth/otp";
import { emit } from "../../platform/events";
import { assertModuleActive, getTenantEntitlements } from "../../platform/modules/service";
import { smsGateway } from "../../platform/sms";
import { getSettings, transition } from "../calendar/service";
import { tehranNow } from "../calendar/availability";
import { findOrCreateByPhone } from "../customers/service";
import * as loyalty from "../loyalty/service";
import * as memberships from "../memberships/service";
import * as referral from "../referral/service";
import { canCancel, otpKey } from "./rules";

// Everything here acts on the signed-in customer's own record, resolved from the session — never from a client-supplied id.

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function salonBySlug(slug: string) {
  const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, status: true } });
  // The same generic answer whether the salon doesn't exist or just doesn't offer the portal.
  if (!t || t.status !== "ACTIVE") throw notFound("پنل مشتری برای این سالن فعال نیست");
  await assertModuleActive(t.id, "portal").catch(() => { throw notFound("پنل مشتری برای این سالن فعال نیست"); });
  return t;
}

// ───────── signing in ─────────

export async function requestLogin(slug: string, phone: string) {
  const t = await salonBySlug(slug);
  const code = await createCode(otpKey(t.id, phone));
  try {
    await smsGateway().send(phone, `کد ورود به ${t.name}: ${code}\nاین کد را در اختیار کسی قرار ندهید.`);
  } catch (e) {
    console.error("[portal] otp sms failed", e);
    throw new HttpError(502, "SMS_FAILED", "ارسال پیامک ممکن نشد؛ کمی بعد دوباره تلاش کنید");
  }
  return { expiresIn: 120 };
}

/** Verifies the code; first-time customers are asked for a name (before the code is spent) and registered. */
export async function verifyLogin(slug: string, b: { phone: string; code: string; name?: string; ref?: string }): Promise<Session> {
  const t = await salonBySlug(slug);
  const key = otpKey(t.id, b.phone);
  const existing = await prisma.customer.findUnique({ where: { tenantId_phone: { tenantId: t.id, phone: b.phone } } });
  if (!existing && !b.name) {
    await checkCode(key, b.code, false); // proves the code first, without spending it
    throw new HttpError(422, "NAME_REQUIRED", "برای ثبت‌نام نام و نام خانوادگی را وارد کنید");
  }
  await checkCode(key, b.code);
  const customer = existing ?? (await findOrCreateByPhone(t.id, b.name!, b.phone, "پنل مشتری"));
  if (!existing && b.ref) await emit("referral.code", t.id, { customerId: customer.id, code: b.ref });
  if (customer.archivedAt) await prisma.customer.update({ where: { id: customer.id }, data: { archivedAt: null } });
  return { userId: customer.id, role: "CUSTOMER", tenantId: t.id, name: customer.name };
}

/** The customer behind a portal session; a customer archived or removed since signing in loses access. */
export async function current(s: Session) {
  const c = s.tenantId ? await prisma.customer.findFirst({ where: { id: s.userId, tenantId: s.tenantId, archivedAt: null } }) : null;
  if (!c) throw unauthorized();
  return c;
}

// ───────── reading ─────────

const on = async (tenantId: string, id: string) => assertModuleActive(tenantId, id).then(() => true, () => false);

export async function me(s: Session) {
  const c = await current(s);
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: c.tenantId }, select: { name: true, slug: true, city: true } });
  const ent = await getTenantEntitlements(c.tenantId);
  const active = (id: string) => ent.modules.find((m) => m.id === id)?.active ?? false;
  return {
    id: c.id, name: c.name, phone: c.phone, birthDate: c.birthDate ? ymd(c.birthDate) : null, salon: tenant,
    features: { booking: active("calendar"), loyalty: active("loyalty"), referral: active("referral"), memberships: active("memberships"), giftcards: active("giftcards") },
  };
}

export async function updateProfile(s: Session, p: { name?: string; birthDate?: string | null }) {
  const c = await current(s);
  await prisma.customer.update({ where: { id: c.id }, data: { ...(p.name ? { name: p.name } : {}), ...(p.birthDate !== undefined ? { birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00.000Z`) : null } : {}) } });
  return me(s);
}

export async function appointments(s: Session) {
  const c = await current(s);
  const { cancelHours } = await getSettings(c.tenantId);
  const rows = await prisma.appointment.findMany({ where: { tenantId: c.tenantId, customerId: c.id }, orderBy: [{ date: "desc" }, { startMin: "desc" }], take: 60, include: { staff: { select: { name: true } } } });
  const today = tehranNow().date;
  return {
    cancelHours,
    items: rows.map((a) => {
      const date = ymd(a.date);
      return { id: a.id, date, startMin: a.startMin, durationMin: a.durationMin, status: a.status, serviceName: a.serviceName, staffName: a.staff.name, price: a.price, upcoming: date >= today && (a.status === "PENDING" || a.status === "CONFIRMED"), canCancel: canCancel({ status: a.status, date, startMin: a.startMin }, cancelHours) };
    }),
  };
}

export async function cancelAppointment(s: Session, id: string) {
  const c = await current(s);
  const a = await prisma.appointment.findFirst({ where: { id, tenantId: c.tenantId, customerId: c.id } });
  if (!a) throw notFound("نوبت پیدا نشد");
  const { cancelHours } = await getSettings(c.tenantId);
  if (!canCancel({ status: a.status, date: ymd(a.date), startMin: a.startMin }, cancelHours)) throw conflict(`لغو نوبت فقط تا ${cancelHours} ساعت قبل از آن ممکن است؛ با سالن تماس بگیرید`, "TOO_LATE");
  await transition(c.tenantId, id, "CANCELED", "لغو توسط مشتری");
  return { ok: true };
}

export async function rewards(s: Session) {
  const c = await current(s);
  if (!(await on(c.tenantId, "loyalty"))) throw notFound("باشگاه مشتریان برای این سالن فعال نیست");
  const [state, cfg] = await Promise.all([loyalty.customerState(c.tenantId, c.id), loyalty.getConfig(c.tenantId)]);
  return { ...state, tiers: cfg.tiers, rewards: cfg.rewards };
}

/** Customers can claim wallet rewards themselves; service/product vouchers are honoured at the salon by staff. */
export async function redeemReward(s: Session, rewardId: string) {
  const c = await current(s);
  if (!(await on(c.tenantId, "loyalty"))) throw notFound("باشگاه مشتریان برای این سالن فعال نیست");
  const reward = (await loyalty.getConfig(c.tenantId)).rewards.find((r) => r.id === rewardId);
  if (!reward) throw notFound("جایزه پیدا نشد");
  if (reward.kind !== "wallet") throw conflict("برای دریافت این جایزه در مراجعه‌ی بعد به سالن اطلاع دهید", "AT_SALON");
  const r = await loyalty.redeem(c.tenantId, c.id, rewardId);
  return { reward: r.reward, wallet: r.state.wallet, points: r.state.points };
}

export async function wallet(s: Session) {
  const c = await current(s);
  if (!(await on(c.tenantId, "loyalty"))) throw notFound("کیف پول برای این سالن فعال نیست");
  const st = await loyalty.customerState(c.tenantId, c.id);
  return { balance: st.wallet, log: st.log.filter((l) => l.wallet !== 0) };
}

export async function invite(s: Session) {
  const c = await current(s);
  if (!(await on(c.tenantId, "referral"))) throw notFound("برنامه‌ی معرفی برای این سالن فعال نیست");
  const [st, cfg, tenant] = await Promise.all([referral.customerState(c.tenantId, c.id), referral.getConfig(c.tenantId), prisma.tenant.findUniqueOrThrow({ where: { id: c.tenantId }, select: { slug: true } })]);
  return { code: st.code, enabled: cfg.enabled, friends: st.friends, rewardedFriends: st.rewardedFriends, pointsEarned: st.pointsEarned, referrerPts: cfg.referrerPts, friendOff: cfg.friendOff, path: `/s/${tenant.slug}?ref=${st.code}` };
}

export async function membership(s: Session) {
  const c = await current(s);
  if (!(await on(c.tenantId, "memberships"))) throw notFound("عضویت برای این سالن فعال نیست");
  return memberships.customerState(c.tenantId, c.id);
}
