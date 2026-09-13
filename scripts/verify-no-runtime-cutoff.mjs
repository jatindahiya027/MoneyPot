import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("src");
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(target);
    else if (/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) {
      const lines = (await readFile(target, "utf8")).split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.includes("2026-01-01") || line.includes("FINANCE_START_DATE")) {
          violations.push(`${path.relative(process.cwd(), target)}:${index + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

await scan(root);
assert.deepEqual(violations, [], `runtime must not hard-code the one-time database cutoff:\n${violations.join("\n")}`);
console.log("Runtime cutoff verification passed: the one-time database compaction is not implemented in application code.");
