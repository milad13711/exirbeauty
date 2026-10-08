import { describe, expect, it } from "vitest";
import { isComplete, isFree, progress, serialFor, validLesson, visibleTo } from "./rules";

describe("academy rules", () => {
  it("shows audiences by role", () => {
    expect(visibleTo("ALL", "STAFF")).toBe(true);
    expect(visibleTo("OWNER", "OWNER")).toBe(true);
    expect(visibleTo("OWNER", "STAFF")).toBe(false);
    expect(visibleTo("STAFF", "STAFF")).toBe(true);
    expect(visibleTo("STAFF", "OWNER")).toBe(false);
  });
  it("free means price 0 or included in the plan", () => {
    expect(isFree({ price: 0, inPlans: [] }, null)).toBe(true);
    expect(isFree({ price: 500, inPlans: ["salon"] }, "salon")).toBe(true);
    expect(isFree({ price: 500, inPlans: ["salon"] }, "artist")).toBe(false);
    expect(isFree({ price: 500, inPlans: ["salon"] }, null)).toBe(false);
  });
  it("progress counts distinct lessons and completes at all of them", () => {
    expect(progress([0, 0, 1], 4)).toBe(50);
    expect(progress([], 0)).toBe(0);
    expect(isComplete([0, 1, 2], 3)).toBe(true);
    expect(isComplete([0, 1], 3)).toBe(false);
    expect(isComplete([], 0)).toBe(false);
  });
  it("validates lesson numbers", () => {
    expect(validLesson(0, 3)).toBe(true); expect(validLesson(3, 3)).toBe(false); expect(validLesson(-1, 3)).toBe(false); expect(validLesson(1.5, 3)).toBe(false);
  });
  it("makes readable certificate numbers", () => {
    expect(serialFor("cm123abcdef", new Date("2026-10-09T00:00:00Z"))).toBe("EX-2026-ABCDEF");
  });
});
