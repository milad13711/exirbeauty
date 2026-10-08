import { describe, expect, it } from "vitest";
import { CATEGORIES, canAdvance, isCategory } from "./catalog";

describe("network catalog", () => {
  it("knows its categories", () => {
    expect(CATEGORIES).toHaveLength(10);
    expect(isCategory("بیمه")).toBe(true);
    expect(isCategory("هر چیزی")).toBe(false);
  });
  it("statuses only move forward", () => {
    expect(canAdvance("SUBMITTED", "REVIEWING")).toBe(true);
    expect(canAdvance("SUBMITTED", "ANSWERED")).toBe(true);
    expect(canAdvance("ANSWERED", "REVIEWING")).toBe(false);
    expect(canAdvance("REVIEWING", "REVIEWING")).toBe(false);
  });
});
