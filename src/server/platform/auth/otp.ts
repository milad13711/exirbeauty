import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../db";
import { env } from "../../env";
import { HttpError, tooMany, unauthorized } from "../../http/errors";
import { smsGateway } from "../sms";

const TTL_MS = 2 * 60_000;
const COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

const hash = (phone: string, code: string) => createHmac("sha256", env().AUTH_SECRET).update(`otp:${phone}:${code}`).digest("hex");

/**
 * Sends a login code. The response never reveals whether the phone is registered, and no SMS
 * (= no cost) is sent to numbers that aren't an active user.
 */
export async function requestOtp(phone: string): Promise<{ expiresIn: number }> {
  const recent = await prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (recent && Date.now() - recent.createdAt.getTime() < COOLDOWN_MS) throw tooMany("کد قبلی به‌تازگی ارسال شده؛ کمی صبر کنید");

  const user = await prisma.user.findUnique({ where: { phone } });
  if (user?.active) {
    const code = String(randomInt(100_000, 1_000_000));
    await prisma.$transaction([
      prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } }),
      prisma.otpCode.create({ data: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + TTL_MS) } }),
    ]);
    try {
      await smsGateway().send(phone, `کد ورود اکسیر: ${code}\nاین کد را در اختیار کسی قرار ندهید.`);
    } catch (e) {
      console.error("[otp] sms failed", e);
      throw new HttpError(502, "SMS_FAILED", "ارسال پیامک ممکن نشد؛ کمی بعد دوباره تلاش کنید");
    }
  } else {
    // Keep the cooldown/limits behaviour identical for unknown numbers.
    await prisma.otpCode.create({ data: { phone, codeHash: "-", expiresAt: new Date(Date.now() + TTL_MS), consumedAt: new Date() } });
  }
  return { expiresIn: TTL_MS / 1000 };
}

export async function verifyOtp(phone: string, code: string) {
  const row = await prisma.otpCode.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row) throw unauthorized("کد نامعتبر یا منقضی شده است");
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    throw tooMany("تعداد تلاش‌ها زیاد بود؛ کد جدید بگیرید");
  }
  const a = Buffer.from(row.codeHash, "hex"), b = Buffer.from(hash(phone, code), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw unauthorized("کد نامعتبر یا منقضی شده است");
  }
  // Single use: claim it atomically so two parallel requests can't both succeed.
  const claimed = await prisma.otpCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (claimed.count !== 1) throw unauthorized("کد نامعتبر یا منقضی شده است");
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.active) throw unauthorized("کد نامعتبر یا منقضی شده است");
  return user;
}
