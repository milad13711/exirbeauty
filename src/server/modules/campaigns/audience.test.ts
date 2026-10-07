import { describe, expect, it } from "vitest";
import { firstName, hasFilter, jalaliMonth, matches, type Facts } from "./audience";

const f = (o: Partial<Facts> = {}): Facts => ({ daysSinceVisit: 10, totalSpent: 1_000_000, tier: "طلایی", services: new Set(["رنگ"]), birthMonth: 7, ...o });
const ctx = { month: 7 };

describe("campaign audience", () => {
  it("an empty segment matches everyone but hasFilter says it's empty", () => {
    expect(hasFilter({})).toBe(false);
    expect(hasFilter({ tiers: [] })).toBe(false);
    expect(hasFilter({ inactiveDays: 0 })).toBe(true);
    expect(matches(f(), {}, ctx)).toBe(true);
  });
  it("inactive customers need a past visit that is old enough (never-visited don't count)", () => {
    expect(matches(f({ daysSinceVisit: 60 }), { inactiveDays: 45 }, ctx)).toBe(true);
    expect(matches(f({ daysSinceVisit: 44 }), { inactiveDays: 45 }, ctx)).toBe(false);
    expect(matches(f({ daysSinceVisit: null }), { inactiveDays: 45 }, ctx)).toBe(false);
  });
  it("filters by tier, birthday month, spend and service, all combined (AND)", () => {
    expect(matches(f(), { tiers: ["VIP", "طلایی"] }, ctx)).toBe(true);
    expect(matches(f({ tier: null }), { tiers: ["VIP"] }, ctx)).toBe(false);
    expect(matches(f({ birthMonth: 8 }), { birthdayMonth: true }, ctx)).toBe(false);
    expect(matches(f({ birthMonth: null }), { birthdayMonth: true }, ctx)).toBe(false);
    expect(matches(f({ totalSpent: 499_999 }), { minSpend: 500_000 }, ctx)).toBe(false);
    expect(matches(f(), { service: "فیشال" }, ctx)).toBe(false);
    expect(matches(f(), { tiers: ["طلایی"], service: "رنگ", minSpend: 1 }, ctx)).toBe(true);
    expect(matches(f(), { tiers: ["طلایی"], service: "فیشال" }, ctx)).toBe(false);
  });
  it("converts dates to the Jalali month and takes first names", () => {
    expect(jalaliMonth(new Date("2026-10-07T00:00:00Z"))).toBe(7); // مهر
    expect(jalaliMonth(new Date("2026-03-21T00:00:00Z"))).toBe(1); // فروردین
    expect(firstName("  سارا  محمدی ")).toBe("سارا");
  });
});
