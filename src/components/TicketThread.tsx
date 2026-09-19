"use client";
import { useState } from "react";
import clsx from "clsx";
import { Send } from "lucide-react";
import { Badge, Button, fieldCls, type Tone } from "@/components/ui";
import { ops } from "@/lib/ops";
import { dayInfo } from "@/lib/dates";
import type { Ticket } from "@/lib/db";

export const ticketTone: Record<Ticket["status"], Tone> = { "باز": "amber", "در حال بررسی": "sky", "بسته": "neutral" };

export function TicketThread({ t, as, name }: { t: Ticket; as: "salon" | "admin"; name: string }) {
  const [text, setText] = useState("");
  const send = () => { if (text.trim().length < 2) return; ops.replyTicket(t.id, { from: as, name, text: text.trim() }); setText(""); };
  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {t.messages.map((m, i) => {
          const mine = m.from === as;
          return (
            <li key={i} className={clsx("flex", mine ? "justify-start" : "justify-end")}>
              <div className={clsx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-7", mine ? "bg-rosesoft text-ink" : "bg-surface2 text-ink")}>
                <p className="mb-0.5 text-[11px] font-bold text-ink3">{m.name} · {m.day === 0 ? "امروز" : dayInfo(m.day).short}</p>{m.text}
              </div>
            </li>
          );
        })}
      </ul>
      {t.status === "بسته" && <p className="text-center text-xs text-ink3">این تیکت بسته شده است؛ با پاسخ جدید دوباره باز می‌شود.</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-line pt-3">
        <input aria-label="پاسخ" value={text} onChange={(e) => setText(e.target.value)} placeholder="پاسخ خود را بنویسید…" className={`${fieldCls} min-w-0 flex-1`} />
        <Button type="submit" disabled={text.trim().length < 2}><Send size={14} />ارسال</Button>
      </form>
    </div>
  );
}
export const StatusBadge = ({ s }: { s: Ticket["status"] }) => <Badge tone={ticketTone[s]}>{s}</Badge>;
