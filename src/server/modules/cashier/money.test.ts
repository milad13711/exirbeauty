import { describe, expect, it } from "vitest";
import { allocateDebt, commissions, netOf, summarize, totals } from "./money";

describe("totals", () => {
  it("applies a percentage discount with rounding", () => {
    expect(totals([{ qty: 2, price: 450_000 }, { qty: 1, price: 1_800_000 }], 10)).toEqual({ subtotal: 2_700_000, discount: 270_000, total: 2_430_000 });
    expect(totals([{ qty: 1, price: 333 }], 10)).toEqual({ subtotal: 333, discount: 33, total: 300 });
  });
  it("no discount, empty invoice", () => {
    expect(totals([{ qty: 3, price: 1000 }], 0).total).toBe(3000);
    expect(totals([], 20)).toEqual({ subtotal: 0, discount: 0, total: 0 });
  });
  it("total always equals subtotal − discount (what the DB constraint requires)", () => {
    for (const pct of [0, 7, 33, 50, 99, 100]) for (const price of [1, 999, 12_345, 1_800_000]) {
      const t = totals([{ qty: 1, price }], pct);
      expect(t.total).toBe(t.subtotal - t.discount);
      expect(t.total).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("allocateDebt (oldest first)", () => {
  const owed = [
    { id: "b", debt: 300, date: "2026-10-02", number: 2 },
    { id: "a", debt: 500, date: "2026-10-01", number: 1 },
    { id: "c", debt: 200, date: "2026-10-02", number: 3 },
    { id: "z", debt: 0, date: "2026-09-01", number: 0 },
  ];
  it("settles the oldest invoice first and spills over in date, then number, order", () => {
    const r = allocateDebt(owed, 700);
    expect(r.allocations).toEqual([{ id: "a", take: 500, remaining: 0 }, { id: "b", take: 200, remaining: 100 }]);
    expect(r.unplaced).toBe(0);
  });
  it("reports what could not be placed", () => expect(allocateDebt(owed, 2000).unplaced).toBe(1000));
  it("a partial payment leaves the rest on the oldest", () => expect(allocateDebt(owed, 100).allocations).toEqual([{ id: "a", take: 100, remaining: 400 }]));
  it("zero changes nothing", () => expect(allocateDebt(owed, 0).allocations).toEqual([]));
});

describe("summarize", () => {
  const sales = [
    { total: 900, paid: 900, discountPct: 10, discount: 100, lines: [{ kind: "SERVICE" as const, qty: 1, price: 800 }, { kind: "PRODUCT" as const, qty: 1, price: 200 }], payments: [{ method: "CASH" as const, amount: 400 }, { method: "CARD" as const, amount: 500 }] },
    { total: 500, paid: 200, discountPct: 0, discount: 0, lines: [{ kind: "SERVICE" as const, qty: 1, price: 500 }], payments: [{ method: "CASH" as const, amount: 200 }] },
  ];
  it("adds up the day", () => {
    const s = summarize(sales, [{ amount: 150, method: "CASH" }, { amount: 50, method: "CARD" }], [{ amount: 100, method: "CASH" }]);
    expect(s).toMatchObject({ count: 2, revenue: 1400, services: 1300, products: 200, discounts: 100, cash: 600, card: 500, online: 0, newDebt: 300, debtCollected: 100, expenses: 200, net: 1200 });
    expect(s.cashExpected).toBe(600 + 100 - 150); // cash taken + cash debt collected − cash expenses
  });
  it("is all zeros for an empty day", () => expect(summarize([], [], [])).toMatchObject({ count: 0, revenue: 0, cashExpected: 0, net: 0 }));
});

describe("commissions", () => {
  it("uses each line's snapshot percentage on its discounted value", () => {
    const r = commissions([{ discountPct: 10, lines: [{ kind: "SERVICE", qty: 1, price: 1000, staffId: "s1", commissionPct: 30 }, { kind: "SERVICE", qty: 2, price: 500, staffId: "s2", commissionPct: 50 }, { kind: "PRODUCT", qty: 1, price: 999, staffId: "s1", commissionPct: 90 }] }]);
    expect(netOf({ qty: 1, price: 1000 }, 10)).toBe(900);
    expect(r.find((x) => x.staffId === "s1")).toEqual({ staffId: "s1", revenue: 900, commission: 270 }); // product line ignored
    expect(r.find((x) => x.staffId === "s2")).toEqual({ staffId: "s2", revenue: 900, commission: 450 });
  });
  it("ignores lines without a staff member", () => expect(commissions([{ discountPct: 0, lines: [{ kind: "SERVICE", qty: 1, price: 100 }] }])).toEqual([]));
});

describe("gift cards in the summary", () => {
  it("selling a card takes money in but books no revenue; spending one books revenue but no cash", () => {
    const sold = { total: 1_000_000, paid: 1_000_000, discountPct: 0, discount: 0, lines: [{ kind: "GIFT" as const, qty: 1, price: 1_000_000 }], payments: [{ method: "CASH" as const, amount: 1_000_000 }] };
    const spent = { total: 600_000, paid: 600_000, discountPct: 0, discount: 0, lines: [{ kind: "SERVICE" as const, qty: 1, price: 600_000 }], payments: [{ method: "GIFT" as const, amount: 600_000 }] };
    const s = summarize([sold, spent], [], []);
    expect(s).toMatchObject({ revenue: 600_000, giftSold: 1_000_000, giftSpent: 600_000, cash: 1_000_000, cashExpected: 1_000_000, services: 600_000, products: 0 });
  });
});
