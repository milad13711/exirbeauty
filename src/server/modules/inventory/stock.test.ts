import { describe, expect, it } from "vitest";
import { deduct, isLow, quantities, summarize } from "./stock";

describe("inventory rules", () => {
  it("adds up quantities per product, ignoring non-product and unlinked lines", () => {
    const q = quantities([
      { kind: "PRODUCT", refId: "a", qty: 2 }, { kind: "PRODUCT", refId: "a", qty: 1 }, { kind: "PRODUCT", refId: "b", qty: 4 },
      { kind: "PRODUCT", refId: null, qty: 9 }, { kind: "SERVICE", refId: "a", qty: 5 },
    ]);
    expect([...q]).toEqual([["a", 3], ["b", 4]]);
  });
  it("deducts without going below zero and reports the shortfall", () => {
    expect(deduct(10, 3)).toEqual({ stockAfter: 7, delta: -3, shortfall: 0 });
    expect(deduct(2, 5)).toEqual({ stockAfter: 0, delta: -2, shortfall: 3 });
    expect(deduct(0, 1)).toEqual({ stockAfter: 0, delta: 0, shortfall: 1 });
  });
  it("flags low stock at or below the reorder point", () => {
    expect(isLow({ stock: 3, reorder: 3 })).toBe(true);
    expect(isLow({ stock: 4, reorder: 3 })).toBe(false);
  });
  it("summarizes count, low items, value and distinct suppliers", () => {
    expect(summarize([{ stock: 2, cost: 100, reorder: 3, supplier: "الف" }, { stock: 10, cost: 50, reorder: 3, supplier: " الف " }, { stock: 1, cost: 10, reorder: 0, supplier: "" }]))
      .toEqual({ items: 3, low: 1, value: 710, suppliers: 1 });
  });
});
