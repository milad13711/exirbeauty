"use client";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "./Avatar";
import { readPhoto } from "@/lib/theme";

/** انتخاب/تغییر/حذف عکس پروفایل (گرد)؛ ذخیره را والد انجام می‌دهد */
export function PhotoPicker({ name, value, onChange, size = 72, color }: { name: string; value?: string; onChange: (photo?: string) => void; size?: number; color?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");
  const pick = async (f?: File) => { if (!f) return; try { onChange(await readPhoto(f)); setErr(""); } catch (e) { setErr((e as Error).message); } };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} aria-label="تغییر عکس پروفایل" className="press group relative cursor-pointer rounded-full">
        <Avatar name={name || "؟"} size={size} color={color} src={value ?? ""} />
        <span className="absolute -bottom-1 -left-1 grid size-8 place-items-center rounded-full border-2 border-surface bg-[image:var(--grad-rose)] text-white"><Camera size={14} /></span>
      </button>
      <div className="space-y-1">
        <button type="button" onClick={() => ref.current?.click()} className="block cursor-pointer text-[13px] font-bold text-rose">{value ? "تغییر عکس" : "افزودن عکس"}</button>
        {value && <button type="button" onClick={() => onChange(undefined)} className="flex cursor-pointer items-center gap-1 text-xs text-danger"><Trash2 size={12} />حذف عکس</button>}
        {err && <p role="alert" className="text-xs text-danger">{err}</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
