// Usage: npm run modules:bump <id> <patch|minor|major> "what changed"
import { readFileSync, writeFileSync } from "node:fs";
import { bumpSemver } from "../src/server/platform/modules/versioning";

const [id, level, ...note] = process.argv.slice(2);
if (!id || !["patch", "minor", "major"].includes(level) || !note.length) {
  console.error('Usage: npm run modules:bump <id> <patch|minor|major> "what changed"');
  process.exit(1);
}
const file = `src/server/modules/${id}/manifest.ts`;
let src: string;
try { src = readFileSync(file, "utf8"); } catch { console.error(`No such module: ${file}`); process.exit(1); }

const m = /version: "(\d+\.\d+\.\d+)"/.exec(src);
if (!m) { console.error(`Could not find version in ${file}`); process.exit(1); }
const next = bumpSemver(m[1], level as "patch" | "minor" | "major");
const text = note.join(" ").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
src = src.replace(/version: "\d+\.\d+\.\d+"/, `version: "${next}"`).replace(/changelog: "(?:[^"\\]|\\.)*"/, `changelog: "${text}"`);
writeFileSync(file, src);
console.log(`${id}: ${m[1]} → ${next}\nNow run: npm run modules:sync`);
