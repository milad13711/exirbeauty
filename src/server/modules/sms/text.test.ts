import { describe, expect, it } from "vitest";
import { dateFa, normalizePhone, packageCredit, parts, render, timeFa } from "./text";

describe("sms text", () => {
  it("counts Persian segments (70 then 67 each)", () => {
    expect(parts("a".repeat(70))).toBe(1);
    expect(parts("a".repeat(71))).toBe(2);
    expect(parts("a".repeat(134))).toBe(2);
    expect(parts("a".repeat(135))).toBe(3);
    expect(parts("سلام")).toBe(1);
  });
  it("renders known variables and keeps unknown ones visible", () => {
    expect(render("{name} - {x}", { name: "سارا" })).toBe("سارا - {x}");
  });
  it("normalizes mobile numbers", () => {
    for (const n of ["09121234567", "9121234567", "+989121234567", "۰۹۱۲۱۲۳۴۵۶۷", "0098 912 123 4567"]) expect(normalizePhone(n)).toBe("09121234567");
    expect(normalizePhone("02112345678")).toBeNull();
    expect(normalizePhone("0912123")).toBeNull();
  });
  it("formats time and date in Persian", () => {
    expect(timeFa(9 * 60 + 5)).toBe("۰۹:۰۵");
    expect(dateFa("2026-10-07")).toBe("۱۵ مهر");
  });
  it("adds the bonus to a package", () => {
    expect(packageCredit(100000, 10)).toBe(110000);
    expect(packageCredit(100000, 0)).toBe(100000);
  });
});
