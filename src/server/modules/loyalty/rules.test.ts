import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG as C, cashbackFor, earnFor, nextGoal, settleTier, tierFor, tierOff } from "./rules";

describe("loyalty rules", () => {
  it("picks the highest reached tier", () => {
    expect(tierFor(C.tiers, 0).name).toBe("برنزی");
    expect(tierFor(C.tiers, 499).name).toBe("برنزی");
    expect(tierFor(C.tiers, 500).name).toBe("نقره‌ای");
    expect(tierFor(C.tiers, 5000).name).toBe("VIP");
    expect(tierOff(C.tiers, "طلایی")).toBe(8);
  });
  it("never demotes", () => {
    expect(settleTier(C.tiers, 100, "VIP")).toBe("VIP");
    expect(settleTier(C.tiers, 600, "برنزی")).toBe("نقره‌ای");
    expect(settleTier(C.tiers, 600, "نقره‌ای")).toBe("نقره‌ای");
  });
  it("earns visit + per-amount points on discounted values", () => {
    const lines = [{ kind: "SERVICE" as const, qty: 1, price: 1_000_000 }, { kind: "PRODUCT" as const, qty: 2, price: 150_000 }];
    // no discount: visit 50 + floor(1,000,000/100,000)*10=100 + floor(300,000/100,000)*15=45
    expect(earnFor(C.earn, lines, 0)).toBe(50 + 100 + 45);
    // 50% off: svc 500,000 → 50 + 50 ; prod 150,000 → 15
    expect(earnFor(C.earn, lines, 50)).toBe(50 + 50 + 15);
  });
  it("gives no visit bonus for a products-only invoice, nothing for an empty one", () => {
    expect(earnFor(C.earn, [{ kind: "PRODUCT", qty: 1, price: 200_000 }], 0)).toBe(30);
    expect(earnFor(C.earn, [], 0)).toBe(0);
  });
  it("computes capped cashback only above the minimum spend", () => {
    expect(cashbackFor(C.cashback, 499_999)).toBe(0);
    expect(cashbackFor(C.cashback, 1_000_000)).toBe(30_000);
    expect(cashbackFor(C.cashback, 50_000_000)).toBe(300_000);
    expect(cashbackFor({ ...C.cashback, on: false }, 1_000_000)).toBe(0);
  });
  it("points at the nearest goal", () => {
    expect(nextGoal(C, 0, 450)).toEqual({ left: 50, label: "اعتبار ۵۰ هزار تومانی" });
    expect(nextGoal(C, 490, 0)).toEqual({ left: 10, label: "سطح نقره‌ای" });
    expect(nextGoal({ tiers: C.tiers, rewards: [] }, 9999, 9999)).toEqual({ left: 0, label: "بالاترین سطح" });
  });
});
