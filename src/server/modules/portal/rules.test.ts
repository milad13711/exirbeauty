import { describe, expect, it } from "vitest";
import { canCancel, otpKey } from "./rules";

describe("portal rules", () => {
  const now = new Date("2030-03-04T06:00:00Z"); // 09:30 Tehran
  const appt = (o: Partial<{ status: string; date: string; startMin: number }> = {}) => ({ status: "CONFIRMED", date: "2030-03-04", startMin: 15 * 60, ...o });
  it("allows cancelling with enough notice and refuses when it's too late", () => {
    expect(canCancel(appt(), 5, now)).toBe(true); // 15:00 is 5.5h away
    expect(canCancel(appt(), 6, now)).toBe(false);
    expect(canCancel(appt({ date: "2030-03-05" }), 12, now)).toBe(true);
    expect(canCancel(appt({ date: "2030-03-03" }), 0, now)).toBe(false); // past
  });
  it("only pending or confirmed appointments can be cancelled", () => {
    for (const status of ["DONE", "CANCELED", "NO_SHOW", "IN_SERVICE"]) expect(canCancel(appt({ status }), 1, now)).toBe(false);
    expect(canCancel(appt({ status: "PENDING" }), 1, now)).toBe(true);
  });
  it("binds the code to salon and phone", () => {
    expect(otpKey("t1", "0912")).not.toBe(otpKey("t2", "0912"));
    expect(otpKey("t1", "0912")).not.toBe("0912"); // never collides with staff login codes
  });
});
