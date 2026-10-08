import { describe, expect, it } from "vitest";
import { canAttach, newCode, normalizeCode, shouldReward } from "./rules";

describe("referral rules", () => {
  it("makes short unambiguous codes", () => {
    const codes = new Set(Array.from({ length: 200 }, () => newCode()));
    expect(codes.size).toBeGreaterThan(190);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it("normalizes what people type", () => {
    expect(normalizeCode(" ab-c 234 ")).toBe("ABC234");
  });
  it("attaches only brand-new, not-yet-referred customers to someone else", () => {
    const ok = { customerId: "f", referrerId: "r", alreadyReferredBy: null, hasPriorSale: false };
    expect(canAttach(ok)).toBe(true);
    expect(canAttach({ ...ok, referrerId: "f" })).toBe(false);
    expect(canAttach({ ...ok, alreadyReferredBy: "x" })).toBe(false);
    expect(canAttach({ ...ok, hasPriorSale: true })).toBe(false);
  });
  it("rewards once, on a paid invoice, with the program on", () => {
    const ok = { enabled: true, referred: true, alreadyRewarded: false, saleTotal: 1 };
    expect(shouldReward(ok)).toBe(true);
    for (const bad of [{ enabled: false }, { referred: false }, { alreadyRewarded: true }, { saleTotal: 0 }]) expect(shouldReward({ ...ok, ...bad })).toBe(false);
  });
});
