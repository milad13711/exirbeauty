import { describe, expect, it } from "vitest";
import { hashToken, newToken, routeFor, stats } from "./rules";

describe("review rules", () => {
  it("makes unguessable tokens whose hash verifies", () => {
    const a = newToken(), b = newToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(20);
    expect(hashToken(a.token)).toBe(a.hash);
    expect(a.hash).not.toContain(a.token);
  });
  it("routes by the threshold", () => {
    expect(routeFor(5, 4)).toBe("PUBLIC"); expect(routeFor(4, 4)).toBe("PUBLIC");
    expect(routeFor(3, 4)).toBe("PRIVATE"); expect(routeFor(3, 3)).toBe("PUBLIC");
  });
  it("summarizes average, distribution, open complaints and per-staff scores", () => {
    const s = stats([
      { rating: 5, staffId: "a", route: "PUBLIC", resolved: false }, { rating: 4, staffId: "a", route: "PUBLIC", resolved: false },
      { rating: 2, staffId: "b", route: "PRIVATE", resolved: false }, { rating: 1, staffId: null, route: "PRIVATE", resolved: true },
    ]);
    expect(s).toMatchObject({ answered: 4, avg: 3, dist: [1, 1, 0, 1, 1], publicCount: 2, openPrivate: 1 });
    expect(s.byStaff).toEqual([{ staffId: "a", n: 2, avg: 4.5 }, { staffId: "b", n: 1, avg: 2 }]);
    expect(stats([])).toMatchObject({ answered: 0, avg: 0, openPrivate: 0 });
  });
});
