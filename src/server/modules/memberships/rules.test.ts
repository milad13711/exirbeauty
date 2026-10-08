import { describe, expect, it } from "vitest";
import { effectiveStatus, mrr, termFor } from "./rules";

describe("membership rules", () => {
  it("a new membership runs 30 days per month from today", () => {
    expect(termFor("2026-10-01", 1)).toEqual({ start: "2026-10-01", expiry: "2026-10-31" });
    expect(termFor("2026-10-01", 3, "2026-09-01")).toEqual({ start: "2026-10-01", expiry: "2026-12-30" }); // lapsed: restarts today
  });
  it("renewing a valid membership continues from its expiry", () => {
    expect(termFor("2026-10-01", 1, "2026-10-10").expiry).toBe("2026-11-09");
    expect(termFor("2026-10-01", 1, "2026-10-01").expiry).toBe("2026-10-31"); // expires today = still valid
  });
  it("validity follows the date; cancellation wins", () => {
    expect(effectiveStatus({ status: "ACTIVE", expiryDate: "2026-10-01" }, "2026-10-01")).toBe("ACTIVE");
    expect(effectiveStatus({ status: "ACTIVE", expiryDate: "2026-09-30" }, "2026-10-01")).toBe("EXPIRED");
    expect(effectiveStatus({ status: "CANCELED", expiryDate: "2030-01-01" }, "2026-10-01")).toBe("CANCELED");
  });
  it("spreads price over months for MRR", () => {
    expect(mrr([{ price: 999_000, months: 1 }, { price: 2_400_000, months: 3 }])).toBe(1_799_000);
    expect(mrr([])).toBe(0);
  });
});
