// Pure review rules (no DB).
import { createHash, randomBytes } from "node:crypto";

/** A new survey link secret and the hash we keep (the secret itself is only ever in the SMS). */
export function newToken() {
  const token = randomBytes(18).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Happy customers are invited to post publicly; unhappy ones reach the owner privately. */
export const routeFor = (rating: number, threshold: number): "PUBLIC" | "PRIVATE" => (rating >= threshold ? "PUBLIC" : "PRIVATE");

export function stats(rows: { rating: number; staffId: string | null; route: "PUBLIC" | "PRIVATE"; resolved: boolean }[]) {
  const n = rows.length;
  const avg = n ? rows.reduce((a, r) => a + r.rating, 0) / n : 0;
  const dist = [1, 2, 3, 4, 5].map((k) => rows.filter((r) => r.rating === k).length);
  const staff = new Map<string, { n: number; sum: number }>();
  for (const r of rows) if (r.staffId) { const c = staff.get(r.staffId) ?? { n: 0, sum: 0 }; c.n++; c.sum += r.rating; staff.set(r.staffId, c); }
  return {
    answered: n, avg: Math.round(avg * 10) / 10, dist,
    publicCount: rows.filter((r) => r.route === "PUBLIC").length,
    openPrivate: rows.filter((r) => r.route === "PRIVATE" && !r.resolved).length,
    byStaff: [...staff].map(([staffId, c]) => ({ staffId, n: c.n, avg: Math.round((c.sum / c.n) * 10) / 10 })).sort((a, b) => b.avg - a.avg),
  };
}
