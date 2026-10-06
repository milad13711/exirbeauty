import { describe, expect, it } from "vitest";
import { bumpSemver, compareSemver, decideRelease, moduleChecksum } from "./versioning";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("semver", () => {
  it("compares numerically, not lexically", () => {
    expect(compareSemver("1.10.0", "1.9.0")).toBe(1);
    expect(compareSemver("2.0.0", "10.0.0")).toBe(-1);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });
  it("bumps and resets lower parts", () => {
    expect(bumpSemver("1.2.3", "patch")).toBe("1.2.4");
    expect(bumpSemver("1.2.3", "minor")).toBe("1.3.0");
    expect(bumpSemver("1.2.3", "major")).toBe("2.0.0");
  });
  it("rejects malformed versions", () => expect(() => compareSemver("1.2", "1.2.3")).toThrow());
});

describe("decideRelease", () => {
  const last = { version: "1.0.0", checksum: "aaa" };
  it("first sight is a new module", () => expect(decideRelease("m", { version: "1.0.0", checksum: "aaa" }, null).kind).toBe("new"));
  it("same code, same version: nothing to do", () => expect(decideRelease("m", last, last).kind).toBe("unchanged"));
  it("changed code needs a version bump", () => {
    const d = decideRelease("m", { version: "1.0.0", checksum: "bbb" }, last);
    expect(d).toMatchObject({ kind: "error", reason: "NEEDS_BUMP" });
  });
  it("bumped version is a release", () => expect(decideRelease("m", { version: "1.0.1", checksum: "bbb" }, last).kind).toBe("release"));
  it("going backwards is refused", () => expect(decideRelease("m", { version: "0.9.0", checksum: "bbb" }, last)).toMatchObject({ kind: "error", reason: "DOWNGRADE" }));
});

describe("moduleChecksum", () => {
  const make = (files: Record<string, string>) => {
    const root = mkdtempSync(path.join(tmpdir(), "mods-"));
    mkdirSync(path.join(root, "m"), { recursive: true });
    for (const [f, c] of Object.entries(files)) writeFileSync(path.join(root, "m", f), c);
    return root;
  };
  it("changes when any file changes", () => {
    expect(moduleChecksum("m", make({ "a.ts": "1" }))).not.toBe(moduleChecksum("m", make({ "a.ts": "2" })));
  });
  it("is stable for identical content and ignores test files", () => {
    expect(moduleChecksum("m", make({ "a.ts": "1" }))).toBe(moduleChecksum("m", make({ "a.ts": "1", "a.test.ts": "anything" })));
  });
});
