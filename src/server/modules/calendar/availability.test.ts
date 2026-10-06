import { describe, expect, it } from "vitest";
import { DEFAULT_HOURS, addDays, canTransition, earliestFor, fits, freeStarts, instantOf, isMovable, isRealDate, tehranNow, weekdayOf, workWindow } from "./availability";

const staff = { startMin: 540, endMin: 1140, daysOff: [6], breaks: [{ s: 720, e: 780 }] }; // 9–19, lunch 12–13
const win = (weekday = 0, extra: Partial<Parameters<typeof workWindow>[0]> = {}) => workWindow({ weekday, salonHours: DEFAULT_HOURS, staff, onLeave: false, ...extra });

describe("weekdayOf (Saturday = 0)", () => {
  it("maps real dates", () => {
    expect(weekdayOf("2026-10-03")).toBe(0); // Saturday
    expect(weekdayOf("2026-10-04")).toBe(1); // Sunday
    expect(weekdayOf("2026-10-09")).toBe(6); // Friday
  });
});

describe("dates", () => {
  it("validates real calendar dates", () => {
    expect(isRealDate("2026-02-30")).toBe(false);
    expect(isRealDate("2026-10-05")).toBe(true);
    expect(isRealDate("5 Oct")).toBe(false);
  });
  it("adds days across month ends", () => expect(addDays("2026-10-31", 1)).toBe("2026-11-01"));
  it("converts salon-local time to the right UTC instant", () => expect(instantOf("2026-10-05", 600).toISOString()).toBe("2026-10-05T06:30:00.000Z"));
  it("computes local 'now' around the date line", () => {
    expect(tehranNow(new Date("2026-10-05T21:00:00Z"))).toEqual({ date: "2026-10-06", minute: 30 }); // 00:30 next day in Tehran
    expect(tehranNow(new Date("2026-10-05T06:30:00Z"))).toEqual({ date: "2026-10-05", minute: 600 });
  });
});

describe("workWindow", () => {
  it("intersects salon and staff hours", () => {
    expect(workWindow({ weekday: 0, salonHours: DEFAULT_HOURS.map((d) => ({ ...d, start: 600, end: 1080 })), staff, onLeave: false })).toEqual({ s: 600, e: 1080 });
  });
  it("is null on the salon's closed day, staff days off, leave, and empty intersections", () => {
    expect(win(6)).toBeNull();
    expect(win(2, { staff: { ...staff, daysOff: [2] } })).toBeNull();
    expect(win(0, { onLeave: true })).toBeNull();
    expect(workWindow({ weekday: 0, salonHours: DEFAULT_HOURS, staff: { ...staff, startMin: 1200, endMin: 1300 }, onLeave: false })).toBeNull();
  });
});

describe("freeStarts", () => {
  const base = { window: win(), breaks: staff.breaks, busy: [], stepMin: 30 };
  it("offers grid starts that fit and skips breaks", () => {
    const s = freeStarts({ ...base, durationMin: 60 });
    expect(s[0]).toBe(540);
    expect(s).not.toContain(690); // 11:30–12:30 collides with lunch
    expect(s).not.toContain(720);
    expect(s).toContain(660); // 11:00–12:00 ends exactly when lunch starts
    expect(s).toContain(780);
    expect(s.at(-1)).toBe(1080); // 18:00–19:00 is the last that fits
  });
  it("excludes starts overlapping existing appointments but allows touching ones", () => {
    const s = freeStarts({ ...base, durationMin: 60, busy: [{ s: 600, e: 660 }] });
    expect(s).toContain(540); // ends at 10:00 = busy start
    expect(s).not.toContain(570);
    expect(s).not.toContain(600);
    expect(s).toContain(660);
  });
  it("respects the earliest allowed start", () => {
    expect(freeStarts({ ...base, durationMin: 30, earliest: 601 })[0]).toBe(630);
  });
  it("a service longer than any gap yields nothing", () => {
    expect(freeStarts({ ...base, durationMin: 600 })).toEqual([]);
    expect(freeStarts({ ...base, window: null, durationMin: 30 })).toEqual([]);
  });
});

describe("fits (free-form start times for staff)", () => {
  it("accepts off-grid minutes inside the window and rejects the rest", () => {
    const w = win();
    expect(fits(w, staff.breaks, [], 615, 45)).toBe(true);
    expect(fits(w, staff.breaks, [], 530, 30)).toBe(false); // before opening
    expect(fits(w, staff.breaks, [], 1130, 30)).toBe(false); // runs past closing
    expect(fits(w, staff.breaks, [{ s: 600, e: 700 }], 650, 30)).toBe(false);
  });
});

describe("earliestFor (minimum notice)", () => {
  const now = { date: "2026-10-05", minute: 600 };
  it("past days are closed, future days open", () => {
    expect(earliestFor("2026-10-04", now, 120)).toBe(Infinity);
    expect(earliestFor("2026-10-07", now, 120)).toBe(0);
  });
  it("today applies the notice", () => expect(earliestFor("2026-10-05", now, 120)).toBe(720));
  it("notice that runs past midnight spills into tomorrow", () => {
    expect(earliestFor("2026-10-06", { date: "2026-10-05", minute: 1400 }, 120)).toBe(80);
  });
});

describe("status machine", () => {
  it("allows the expected flow", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "IN_SERVICE")).toBe(true);
    expect(canTransition("IN_SERVICE", "DONE")).toBe(true);
  });
  it("terminal states are final and nothing skips back", () => {
    for (const t of ["DONE", "CANCELED", "NO_SHOW"] as const) expect(["PENDING", "CONFIRMED", "IN_SERVICE", "DONE", "CANCELED", "NO_SHOW"].some((x) => canTransition(t, x as never))).toBe(false);
    expect(canTransition("PENDING", "DONE")).toBe(false);
    expect(canTransition("CONFIRMED", "PENDING")).toBe(false);
  });
  it("only pending/confirmed can be moved", () => {
    expect(isMovable("CONFIRMED")).toBe(true);
    expect(isMovable("IN_SERVICE")).toBe(false);
    expect(isMovable("DONE")).toBe(false);
  });
});

import { loadOf } from "./availability";
describe("loadOf", () => {
  it("counts capacity minus breaks and clips bookings to the window", () => {
    expect(loadOf({ s: 540, e: 1080 }, [{ s: 780, e: 840 }], [{ s: 540, e: 600 }, { s: 1050, e: 1140 }])).toEqual({ capacity: 480, booked: 90 });
    expect(loadOf(null, [], [{ s: 0, e: 60 }])).toEqual({ capacity: 0, booked: 0 });
  });
});
