const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function nodeVersion(executable) {
  const result = spawnSync(executable, ["-p", "process.versions.node"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function findNode22() {
  const candidates = [
    process.env.MONEYPOT_NODE,
    process.execPath,
    "/opt/homebrew/opt/node@22/bin/node",
    "/usr/local/opt/node@22/bin/node",
    process.platform === "win32" ? path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "node.exe") : null,
  ].filter(Boolean);
  for (const candidate of [...new Set(candidates)]) {
    if (fs.existsSync(candidate) && nodeVersion(candidate)?.startsWith("22.")) return candidate;
  }
  throw new Error(
    "MoneyPot requires Node 22. Install it with `brew install node@22`, or set MONEYPOT_NODE to a Node 22 executable.",
  );
}

function environmentFor(nodeExecutable) {
  return {
    ...process.env,
    PATH: `${path.dirname(nodeExecutable)}${path.delimiter}${process.env.PATH || ""}`,
  };
}

function reexecWithNode22(script, args) {
  const executable = findNode22();
  if (process.execPath === executable || process.versions.node.startsWith("22.")) return false;
  const result = spawnSync(executable, [script, ...args], {
    cwd: process.cwd(),
    env: environmentFor(executable),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

function run(command, args, options = {}) {
  const executable = findNode22();
  const result = spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    env: { ...environmentFor(executable), ...options.env },
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} exited with code ${result.status}.`);
}

function npmExecutable() {
  const node = findNode22();
  const name = process.platform === "win32" ? "npm.cmd" : "npm";
  const npm = path.join(path.dirname(node), name);
  if (!fs.existsSync(npm)) throw new Error(`npm was not found next to Node 22 at ${npm}.`);
  return npm;
}

module.exports = { environmentFor, findNode22, npmExecutable, reexecWithNode22, run };
