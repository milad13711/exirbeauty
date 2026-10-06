import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseSemver(v: string): [number, number, number] {
  const m = SEMVER.exec(v);
  if (!m) throw new Error(`Invalid version "${v}" (expected x.y.z)`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareSemver(a: string, b: string): number {
  const x = parseSemver(a), y = parseSemver(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

export function bumpSemver(v: string, level: "patch" | "minor" | "major"): string {
  const [ma, mi, pa] = parseSemver(v);
  return level === "major" ? `${ma + 1}.0.0` : level === "minor" ? `${ma}.${mi + 1}.0` : `${ma}.${mi}.${pa + 1}`;
}

/** Hash of every source file in the module's folder (tests excluded), so any code change is detectable. */
export function moduleChecksum(id: string, root = path.join(process.cwd(), "src/server/modules")): string {
  const dir = path.join(root, id);
  const files: string[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (!/\.(test|int\.test)\.ts$/.test(name)) files.push(full);
    }
  };
  walk(dir);
  const h = createHash("sha256");
  for (const f of files) h.update(path.relative(dir, f)).update("\0").update(readFileSync(f)).update("\0");
  return h.digest("hex");
}

export type ReleaseDecision =
  | { kind: "new" | "release" | "unchanged" }
  | { kind: "error"; reason: "NEEDS_BUMP" | "DOWNGRADE"; message: string };

/**
 * Decides what to do with a module on sync, given the latest recorded release.
 * Rule: code changed ⇒ version must increase. Same code + same version ⇒ nothing to do.
 */
export function decideRelease(id: string, current: { version: string; checksum: string }, latest: { version: string; checksum: string } | null): ReleaseDecision {
  if (!latest) return { kind: "new" };
  const cmp = compareSemver(current.version, latest.version);
  if (cmp < 0) return { kind: "error", reason: "DOWNGRADE", message: `${id}: version ${current.version} is older than the released ${latest.version}` };
  if (cmp === 0) {
    return current.checksum === latest.checksum
      ? { kind: "unchanged" }
      : { kind: "error", reason: "NEEDS_BUMP", message: `${id}: code changed but version is still ${latest.version} — run: npm run modules:bump ${id} patch "what changed"` };
  }
  return { kind: "release" };
}
