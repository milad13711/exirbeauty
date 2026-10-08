import { describe, expect, it } from "vitest";
import { canMove, commissionOf, earnsCommission, isReleasable, orderTotal, recommendCategories, releasableAt } from "./rules";

describe("store rules", () => {
  it("totals and per-line rounded commission", () => {
    const lines = [{ price: 650_000, qty: 2, commissionPct: 12 }, { price: 1_150_000, qty: 1, commissionPct: 15 }];
    expect(orderTotal(lines)).toBe(2_450_000);
    expect(commissionOf(lines)).toBe(156_000 + 172_500);
    expect(commissionOf([{ price: 333, qty: 1, commissionPct: 10 }])).toBe(33);
  });
  it("orders only move forward along their path", () => {
    expect(canMove("PAID", "SHIPPED")).toBe(true); expect(canMove("SHIPPED", "DELIVERED")).toBe(true);
    expect(canMove("DELIVERED", "RETURNED")).toBe(true); expect(canMove("PAID", "DELIVERED")).toBe(false);
    expect(canMove("DELIVERED", "CANCELED")).toBe(false); expect(canMove("RETURNED", "PAID")).toBe(false);
  });
  it("commission is released only after the 7-day return window", () => {
    const d = new Date("2026-10-01T10:00:00Z");
    expect(releasableAt(d).toISOString()).toBe("2026-10-08T10:00:00.000Z");
    const o = { status: "DELIVERED" as const, commissionStatus: "WAITING", deliveredAt: d };
    expect(isReleasable(o, new Date("2026-10-08T09:59:00Z"))).toBe(false);
    expect(isReleasable(o, new Date("2026-10-08T10:00:00Z"))).toBe(true);
    expect(isReleasable({ ...o, commissionStatus: "CREDITED" }, new Date("2027-01-01"))).toBe(false);
    expect(isReleasable({ ...o, status: "RETURNED" as never }, new Date("2027-01-01"))).toBe(false);
  });
  it("no commission on the salon's own people", () => {
    expect(earnsCommission("0912", ["0913"])).toBe(true); expect(earnsCommission("0912", ["0912"])).toBe(false);
  });
  it("recommends by service category", () => {
    expect(recommendCategories("مو")).toContain("مو"); expect(recommendCategories(null)).toEqual(["مو", "پوست"]);
  });
});
