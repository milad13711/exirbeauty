// Pure referral rules (no DB).
import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I: codes get read aloud and typed
export const newCode = (len = 6) => Array.from({ length: len }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Can this customer be recorded as brought in by `referrerId`? */
export function canAttach(f: { customerId: string; referrerId: string; alreadyReferredBy: string | null; hasPriorSale: boolean }): boolean {
  return f.customerId !== f.referrerId && f.alreadyReferredBy === null && !f.hasPriorSale;
}

/** The referrer is rewarded only on the friend's first paid invoice, and only while the program is on. */
export const shouldReward = (f: { enabled: boolean; referred: boolean; alreadyRewarded: boolean; saleTotal: number }) =>
  f.enabled && f.referred && !f.alreadyRewarded && f.saleTotal > 0;
