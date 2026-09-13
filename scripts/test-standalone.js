const path = require("node:path");
const { reexecWithNode22, run } = require("./node22-runtime");
const { TARGETS } = require("./native-runtime-config");

reexecWithNode22(__filename, process.argv.slice(2));

const root = path.resolve(__dirname, "..");
const target = `${process.platform}-${process.arch}`;
if (!TARGETS[target]) throw new Error(`Unsupported standalone smoke-test host: ${target}`);

try {
  run(process.execPath, [path.join(__dirname, "prepare-native-deps.js"), target], { cwd: root });
  run(process.execPath, [path.join(__dirname, "prepare-standalone.js"), target], { cwd: root });
  const electron = require("electron");
  run(electron, [path.join(__dirname, "verify-standalone-runtime.js")], { cwd: root });
} finally {
  run(process.execPath, [path.join(__dirname, "ensure-native.js")], { cwd: root });
}
