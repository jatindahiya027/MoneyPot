const { spawnSync } = require("node:child_process");
const { environmentFor, findNode22 } = require("./node22-runtime");

const [, , script, ...args] = process.argv;
if (!script) throw new Error("Usage: node scripts/run-with-node22.js <script> [...args]");

const node = findNode22();
const result = spawnSync(node, [script, ...args], {
  cwd: process.cwd(),
  env: environmentFor(node),
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
