import { prisma } from "../db";
import { badRequest, notFound } from "../http/errors";

// Small images only (logos, before/after photos): stored in the database, served by an unguessable id.
export const MAX_BYTES = 700_000;
export const MAX_PER_TENANT = 200;
const MIMES = ["image/png", "image/jpeg", "image/webp"];

/** Decodes "data:image/png;base64,..." — only allowed image types (never SVG, which can carry script) and a size cap. */
export function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.slice(0, MAX_BYTES * 2));
  if (!m || !MIMES.includes(m[1])) throw badRequest("فقط تصویر PNG، JPEG یا WebP مجاز است");
  const bytes = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (!bytes.length) throw badRequest("تصویر خالی است");
  if (bytes.length > MAX_BYTES) throw badRequest("حجم تصویر زیاد است (حداکثر ۷۰۰ کیلوبایت)");
  // The bytes must really be that image type, not just claim it.
  const ok = m[1] === "image/png" ? bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) : m[1] === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!ok) throw badRequest("محتوای فایل با نوع تصویر نمی‌خواند");
  return { mime: m[1], bytes };
}

export async function saveMedia(tenantId: string, dataUrl: string) {
  const { mime, bytes } = parseDataUrl(dataUrl);
  if ((await prisma.media.count({ where: { tenantId } })) >= MAX_PER_TENANT) throw badRequest("سقف تعداد تصاویر سالن پر شده است؛ تصاویر قدیمی را حذف کنید");
  const m = await prisma.media.create({ data: { tenantId, mime, data: new Uint8Array(bytes), size: bytes.length } });
  return { id: m.id, url: `/api/v1/media/${m.id}`, size: m.size };
}

export async function readMedia(id: string) {
  const m = await prisma.media.findUnique({ where: { id } });
  if (!m) throw notFound("تصویر پیدا نشد");
  return m;
}

export async function ownsMedia(tenantId: string, id: string) {
  return (await prisma.media.count({ where: { id, tenantId } })) > 0;
}

export async function deleteMedia(tenantId: string, id: string) {
  const r = await prisma.media.deleteMany({ where: { id, tenantId } });
  if (!r.count) throw notFound("تصویر پیدا نشد");
}
