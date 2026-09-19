"use client";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useDB, type Notification } from "@/lib/db";
import { ops } from "@/lib/ops";
import { dayInfo } from "@/lib/dates";

export const useNotifs = (aud: Notification["audience"]) => { const db = useDB(); const list = db.notifications.filter((n) => n.audience === aud); return { list, unread: list.filter((n) => !n.read).length }; };

export function NotificationList({ aud }: { aud: Notification["audience"] }) {
  const { list, unread } = useNotifs(aud);
  return (
    <>
      <div className="mb-4 flex items-center justify-between"><p className="text-sm text-ink2">{unread ? `${unread.toLocaleString("fa-IR")} اعلان خوانده‌نشده` : "همه‌ی اعلان‌ها خوانده شده است"}</p><Button variant="ghost" disabled={!unread} onClick={() => ops.markAllRead(aud)}>علامت‌گذاری همه به‌عنوان خوانده‌شده</Button></div>
      <Card>
        <ul className="divide-y divide-line">
          {list.map((n) => (
            <li key={n.id}><Link href={n.href} onClick={() => ops.markRead(n.id)} className="flex items-start gap-3 px-5 py-4 hover:bg-surface2"><span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.read ? "bg-line" : "bg-rose"}`} aria-label={n.read ? "خوانده‌شده" : "خوانده‌نشده"} /><span className="min-w-0 flex-1"><b className="block text-sm">{n.title}</b><span className="text-sm text-ink2">{n.body}</span></span><span className="shrink-0 text-xs text-ink3">{n.day === 0 ? "امروز" : dayInfo(n.day).short}</span></Link></li>
          ))}
          {!list.length && <li className="grid place-items-center gap-2 px-5 py-14 text-sm text-ink3"><BellOff size={28} />اعلانی وجود ندارد.</li>}
        </ul>
      </Card>
    </>
  );
}
