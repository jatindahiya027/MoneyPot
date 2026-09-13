const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { npmExecutable, reexecWithNode22, run } = require("./node22-runtime");

reexecWithNode22(__filename, process.argv.slice(2));
const root = path.resolve(__dirname, "..");
run(npmExecutable(), ["run", "electron:rebuild"], { cwd: root });
try {
  const electron = require("electron");
  const result = spawnSync(electron, [root], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status || 1;
} finally {
  run(process.execPath, [path.join(__dirname, "ensure-native.js")], { cwd: root });
}
