import { describe, expect, it } from "vitest";
import { parseVerify } from "./zarinpal";

describe("parseVerify", () => {
  it("reads a verified payment", () => {
    expect(parseVerify({ data: { code: 100, ref_id: 12345, card_pan: "6037****1234" }, errors: [] })).toEqual({ code: 100, refId: "12345", cardPan: "6037****1234" });
  });
  it("treats code 101 (already verified) as a code, not an error", () => {
    expect(parseVerify({ data: { code: 101, ref_id: 7 }, errors: [] }).code).toBe(101);
  });
  it("reads the sandbox's real unpaid response (empty data object + errors.code)", () => {
    expect(parseVerify({ data: {}, errors: { code: -51, message: "Session is not valid" } })).toEqual({ code: -51 });
  });
  it("reads the array form of data on failure", () => {
    expect(parseVerify({ data: [], errors: { code: -50 } }).code).toBe(-50);
  });
  it("never yields NaN for a garbage response", () => {
    expect(parseVerify({})).toEqual({ code: -1 });
  });
});
