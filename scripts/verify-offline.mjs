import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat();
}
const candidates = (await files("src")).filter(file => /\.(js|jsx|css|mjs)$/.test(file));
const violations = [];
for (const file of candidates) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    if (!/localhost|127\.0\.0\.1/.test(match[0])) violations.push(`${file}: ${match[0]}`);
  }
}
assert.deepEqual(violations, [], `Remote runtime URLs found:\n${violations.join("\n")}`);
console.log("Offline runtime verified: no CDN or remote asset requests.");
