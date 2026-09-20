"use client";
import { useState } from "react";
import clsx from "clsx";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHead, Toggle, fieldCls } from "@/components/ui";
import { actions, adminRoles, permModules, useDB, type Perm } from "@/lib/db";
import { uid } from "@/lib/factories";
import { digits, isEmail, isPhone } from "@/lib/validate";

const permLabel: Record<Perm, string> = { none: "بدون دسترسی", view: "مشاهده", edit: "ویرایش" };

/** کاربران سالن + ماتریس دسترسی نقش‌ها */
export function SalonUsers() {
  const db = useDB();
  const [form, setForm] = useState({ name: "", phone: "", roleId: "r2" });
  const [err, setErr] = useState("");
  const [roleId, setRoleId] = useState("r2");
  const [newRole, setNewRole] = useState("");
  const [delUser, setDelUser] = useState<string | null>(null);
  const role = db.roles.find((r) => r.id === roleId) ?? db.roles[0];
  const admins = db.users.filter((u) => u.roleId === "r1" && u.active);

  const add = () => {
    if (form.name.trim().length < 3) return setErr("نام کاربر را وارد کنید.");
    if (!isPhone(form.phone)) return setErr("شماره موبایل معتبر نیست.");
    if (db.users.some((u) => digits(u.phone) === digits(form.phone))) return setErr("این شماره قبلاً ثبت شده است.");
    actions.saveUser({ id: uid("u"), name: form.name.trim(), phone: form.phone, roleId: form.roleId, active: true });
    setForm({ name: "", phone: "", roleId: "r2" }); setErr("");
  };
  const lastAdmin = (uId: string) => admins.length === 1 && admins[0].id === uId;

  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="کاربران سالن" hint="افرادی که با موبایل خود وارد پنل می‌شوند" />
        <ul className="divide-y divide-line">
          {db.users.map((u) => (
            <li key={u.id} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3", !u.active && "opacity-55")}>
              <Avatar name={u.name} size={36} />
              <div className="min-w-0 flex-1 basis-40"><b className="block text-sm">{u.name}</b><bdi dir="ltr" className="text-xs text-ink3">{u.phone}</bdi></div>
              <select aria-label={`نقش ${u.name}`} value={u.roleId} onChange={(e) => { if (lastAdmin(u.id) && e.target.value !== "r1") return setErr("حداقل یک مدیر فعال باید باقی بماند."); actions.saveUser({ ...u, roleId: e.target.value }); setErr(""); }} className={`${fieldCls} !w-auto !py-1.5`}>{db.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <Toggle on={u.active} label={`فعال بودن ${u.name}`} onChange={(v) => { if (!v && lastAdmin(u.id)) return setErr("حداقل یک مدیر فعال باید باقی بماند."); actions.saveUser({ ...u, active: v }); setErr(""); }} />
              {delUser === u.id ? (
                <span className="flex items-center gap-1.5 text-xs"><Button className="!bg-danger" onClick={() => { if (lastAdmin(u.id)) { setErr("حداقل یک مدیر فعال باید باقی بماند."); } else actions.deleteUser(u.id); setDelUser(null); }}>حذف</Button><Button variant="ghost" onClick={() => setDelUser(null)}>انصراف</Button></span>
              ) : <button aria-label={`حذف ${u.name}`} onClick={() => setDelUser(u.id)} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={16} /></button>}
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="grid gap-2 border-t border-line p-5 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input aria-label="نام کاربر" placeholder="نام و نام خانوادگی" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} />
          <input aria-label="موبایل کاربر" placeholder="09123456789" dir="ltr" style={{ textAlign: "right" }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={fieldCls} />
          <select aria-label="نقش" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={fieldCls}>{db.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <Button type="submit"><UserPlus size={14} />افزودن</Button>
        </form>
        {err && <p role="alert" className="mx-5 mb-5 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
      </Card>

      <Card>
        <CardHead title="نقش‌ها و دسترسی‌ها" hint="برای هر نقش مشخص کنید هر بخش را ببیند یا ویرایش کند" />
        <div className="flex flex-wrap gap-2 px-5 pb-3" role="tablist">
          {db.roles.map((r) => <button key={r.id} role="tab" aria-selected={role.id === r.id} onClick={() => setRoleId(r.id)} className={clsx("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold", role.id === r.id ? "border-transparent bg-[image:var(--grad-rose)] text-white shadow-[0_8px_18px_-10px_rgba(156,53,88,.7)]" : "border-line bg-surface text-ink2")}>{r.name}<span className="mr-1 text-[11px] opacity-70">({db.users.filter((u) => u.roleId === r.id).length})</span></button>)}
        </div>
        {role.id === "r1" && <p className="mx-5 mb-3 rounded-xl bg-surface2 p-2.5 text-xs text-ink2">نقش «مدیر» همیشه به همه‌ی بخش‌ها دسترسی کامل دارد و قابل تغییر نیست.</p>}
        <ul className="divide-y divide-line border-t border-line">
          {permModules.map((m) => (
            <li key={m} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <b className="min-w-0 flex-1 basis-32 text-sm">{m}</b>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface2 p-1" role="radiogroup" aria-label={`دسترسی ${m}`}>
                {(["none", "view", "edit"] as Perm[]).map((p) => (
                  <button key={p} role="radio" aria-checked={role.perms[m] === p} disabled={role.id === "r1"} onClick={() => actions.saveRole({ ...role, perms: { ...role.perms, [m]: p } })} className={clsx("cursor-pointer rounded-lg px-2.5 py-1.5 text-[12px] font-semibold disabled:cursor-not-allowed", role.perms[m] === p ? (p === "edit" ? "bg-sage text-white" : p === "view" ? "bg-sky text-white" : "bg-surface text-ink2 shadow-sm") : "text-ink3")}>{permLabel[p]}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2 border-t border-line p-5">
          <input aria-label="نام نقش جدید" placeholder="نام نقش جدید (مثلاً مدیر شعبه)" value={newRole} onChange={(e) => setNewRole(e.target.value)} className={`${fieldCls} !w-64`} />
          <Button variant="ghost" onClick={() => { if (newRole.trim().length < 2 || db.roles.some((r) => r.name === newRole.trim())) return; const id = uid("r"); actions.saveRole({ id, name: newRole.trim(), perms: Object.fromEntries(permModules.map((m) => [m, "none"])) }); setRoleId(id); setNewRole(""); }}><Plus size={14} />افزودن نقش</Button>
          {role.id !== "r1" && !db.users.some((u) => u.roleId === role.id) && <Button variant="ghost" className="!text-danger" onClick={() => { actions.deleteRole(role.id); setRoleId("r2"); }}><Trash2 size={14} />حذف این نقش</Button>}
          {role.id !== "r1" && db.users.some((u) => u.roleId === role.id) && <Badge>نقش دارای کاربر قابل حذف نیست</Badge>}
        </div>
      </Card>
    </div>
  );
}

/** کاربران پنل ادمین (سمت ما) */
export function AdminUsers() {
  const db = useDB();
  const [form, setForm] = useState({ name: "", email: "", role: "support" });
  const [err, setErr] = useState("");
  const supers = db.adminUsers.filter((u) => u.role === "super" && u.active);
  const roleName = (id: string) => adminRoles.find((r) => r.id === id)?.name ?? id;
  const last = (id: string) => supers.length === 1 && supers[0].id === id;

  const add = () => {
    if (form.name.trim().length < 2) return setErr("نام را وارد کنید.");
    if (!isEmail(form.email)) return setErr("ایمیل معتبر نیست.");
    if (db.adminUsers.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) return setErr("این ایمیل قبلاً ثبت شده است.");
    actions.saveAdminUser({ id: uid("a"), name: form.name.trim(), email: form.email.trim(), role: form.role, active: true });
    setForm({ name: "", email: "", role: "support" }); setErr("");
  };
  return (
    <div className="space-y-5">
      <Card>
        <CardHead title="کاربران پنل ادمین" />
        <ul className="divide-y divide-line">
          {db.adminUsers.map((u) => (
            <li key={u.id} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3", !u.active && "opacity-55")}>
              <Avatar name={u.name} size={36} color="#3a2431" />
              <div className="min-w-0 flex-1 basis-40"><b className="block text-sm">{u.name}</b><bdi dir="ltr" className="text-xs text-ink3">{u.email}</bdi></div>
              <select aria-label={`نقش ${u.name}`} value={u.role} onChange={(e) => { if (last(u.id) && e.target.value !== "super") return setErr("حداقل یک سوپرادمین فعال باید باقی بماند."); actions.saveAdminUser({ ...u, role: e.target.value }); setErr(""); }} className={`${fieldCls} !w-auto !py-1.5`}>{adminRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <Toggle on={u.active} label={`فعال بودن ${u.name}`} onChange={(v) => { if (!v && last(u.id)) return setErr("حداقل یک سوپرادمین فعال باید باقی بماند."); actions.saveAdminUser({ ...u, active: v }); setErr(""); }} />
              <button aria-label={`حذف ${u.name}`} onClick={() => { if (last(u.id)) return setErr("حداقل یک سوپرادمین فعال باید باقی بماند."); actions.deleteAdminUser(u.id); }} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-dangersoft"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="grid gap-2 border-t border-line p-5 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input aria-label="نام" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} />
          <input aria-label="ایمیل" placeholder="user@exirbeauty.ir" dir="ltr" style={{ textAlign: "right" }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldCls} />
          <select aria-label="نقش" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={fieldCls}>{adminRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <Button type="submit"><UserPlus size={14} />افزودن</Button>
        </form>
        {err && <p role="alert" className="mx-5 mb-5 rounded-xl bg-dangersoft p-2.5 text-xs text-danger">{err}</p>}
      </Card>
      <Card>
        <CardHead title="نقش‌ها" />
        <ul className="divide-y divide-line">{adminRoles.map((r) => <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm"><span><b>{r.name}</b><span className="mr-2 text-ink3">{r.desc}</span></span><Badge>{db.adminUsers.filter((u) => u.role === r.id).length} کاربر</Badge></li>)}</ul>
        <p className="px-5 py-3 text-xs text-ink3">نقش‌های ادمین ثابت‌اند؛ ({roleName("super")} به همه‌چیز دسترسی دارد).</p>
      </Card>
    </div>
  );
}
