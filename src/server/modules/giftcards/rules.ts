// Pure gift-card rules (no DB). The code is a bearer secret: only its hash is stored.
import { createHash, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export const MIN_AMOUNT = 100_000;

export const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashCode = (raw: string) => createHash("sha256").update(normalizeCode(raw)).digest("hex");
/** 12 random characters shown as XXXX-XXXX-XXXX (~60 bits: not guessable even with a bot hammering the till). */
export const newCode = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("").replace(/(.{4})(?=.)/g, "$1-");
export const last4 = (raw: string) => normalizeCode(raw).slice(-4);

/** Amount to take from a card for an invoice portion: never more than the card holds. */
export const spendable = (balance: number, wanted: number) => Math.max(0, Math.min(balance, wanted));
