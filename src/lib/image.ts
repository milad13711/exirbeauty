/** کوچک‌سازی عکس انتخاب‌شده (حداکثر ~۵۲۰ پیکسل، JPEG) تا در ذخیره‌ی مرورگر جا شود */
export async function fileToDataUrl(file: File, max = 520): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("فقط فایل تصویر مجاز است.");
  if (file.size > 12 * 1024 * 1024) throw new Error("حجم عکس بیش از ۱۲ مگابایت است.");
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}
