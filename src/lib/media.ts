"use client";
import { api } from "./api";

/** Shrinks a picked image in the browser (the server only accepts small ones) and uploads it; returns its id and URL. */
export async function uploadImage(file: File, max = 1024): Promise<{ id: string; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("فایل باید تصویر باشد.");
  const src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onerror = () => rej(new Error("خواندن فایل ممکن نشد.")); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file); });
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onerror = () => rej(new Error("تصویر معتبر نیست.")); i.onload = () => res(i); i.src = src; });
  const r = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return api<{ id: string; url: string }>("POST", "/media", { dataUrl: c.toDataURL("image/jpeg", 0.82) });
}
