// Pure content-calendar rules (no DB).
export type Status = "DRAFT" | "SCHEDULED" | "PUBLISHED";

/** What the saved post must carry for each status (the DB also enforces this). */
export function normalize(status: Status, scheduledFor: string | null | undefined, today: string): { ok: true; scheduledFor: string | null } | { ok: false; error: string } {
  if (status === "SCHEDULED") {
    if (!scheduledFor) return { ok: false, error: "برای زمان‌بندی، تاریخ را مشخص کنید" };
    if (scheduledFor < today) return { ok: false, error: "تاریخ زمان‌بندی نمی‌تواند در گذشته باشد" };
    return { ok: true, scheduledFor };
  }
  return { ok: true, scheduledFor: status === "DRAFT" ? null : null };
}

/** Scheduled posts whose day has arrived are the ones to remind the salon about. */
export const dueToday = (posts: { status: Status; scheduledFor: string | null }[], today: string) => posts.filter((p) => p.status === "SCHEDULED" && p.scheduledFor !== null && p.scheduledFor <= today).length;
