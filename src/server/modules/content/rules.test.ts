import { describe, expect, it } from "vitest";
import { dueToday, normalize } from "./rules";

describe("content rules", () => {
  it("a scheduled post needs a date that is not in the past", () => {
    expect(normalize("SCHEDULED", null, "2026-10-09")).toMatchObject({ ok: false });
    expect(normalize("SCHEDULED", "2026-10-08", "2026-10-09")).toMatchObject({ ok: false });
    expect(normalize("SCHEDULED", "2026-10-09", "2026-10-09")).toEqual({ ok: true, scheduledFor: "2026-10-09" });
  });
  it("drafts and published posts carry no schedule", () => {
    expect(normalize("DRAFT", "2026-12-01", "2026-10-09")).toEqual({ ok: true, scheduledFor: null });
    expect(normalize("PUBLISHED", "2026-12-01", "2026-10-09")).toEqual({ ok: true, scheduledFor: null });
  });
  it("counts scheduled posts whose day has come", () => {
    expect(dueToday([{ status: "SCHEDULED", scheduledFor: "2026-10-09" }, { status: "SCHEDULED", scheduledFor: "2026-10-10" }, { status: "DRAFT", scheduledFor: null }, { status: "PUBLISHED", scheduledFor: null }], "2026-10-09")).toBe(1);
  });
});
