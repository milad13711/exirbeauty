import { describe, expect, it } from "vitest";
import { hashCode, last4, newCode, normalizeCode, spendable } from "./rules";

describe("gift card rules", () => {
  it("generates grouped, unambiguous, unique codes", () => {
    const codes = new Set(Array.from({ length: 300 }, () => newCode()));
    expect(codes.size).toBe(300);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){2}$/);
  });
  it("hashes the same however it is typed, and never stores the code", () => {
    const c = newCode();
    expect(hashCode(c)).toBe(hashCode(c.toLowerCase().replace(/-/g, " ")));
    expect(hashCode(c)).not.toContain(normalizeCode(c));
    expect(hashCode(c)).not.toBe(hashCode(newCode()));
    expect(last4("ABCD-EFGH-JKLM")).toBe("JKLM");
  });
  it("never spends more than the balance", () => {
    expect(spendable(500, 800)).toBe(500);
    expect(spendable(500, 200)).toBe(200);
    expect(spendable(0, 100)).toBe(0);
  });
});
