const fs = require("node:fs");
const path = require("node:path");
const { npmExecutable, reexecWithNode22, run } = require("./node22-runtime");
const { parseTarget } = require("./native-deps");

reexecWithNode22(__filename, process.argv.slice(2));

const root = path.resolve(__dirname, "..");
const target = parseTarget(process.argv[2]);
const directoryOnly = process.argv.includes("--dir");
const skipNextBuild = process.argv.includes("--skip-next-build");

function dependenciesReady() {
  try {
    for (const required of ["better-sqlite3/package.json", "electron/package.json", "electron-builder/package.json", "next/package.json"]) {
      require.resolve(required, { paths: [root] });
    }
    return true;
  } catch {
    return false;
  }
}

if (!dependenciesReady()) {
  console.log("Dependencies are incomplete; repairing the interrupted npm install first.");
  run(process.execPath, [path.join(__dirname, "install-dependencies.js")], { cwd: root });
}

try {
  if (!skipNextBuild) run(npmExecutable(), ["run", "build"], { cwd: root });
  run(process.execPath, [path.join(__dirname, "prepare-native-deps.js"), target.key], { cwd: root });
  run(process.execPath, [path.join(__dirname, "prepare-standalone.js"), target.key], { cwd: root });
  if (target.platform === process.platform && target.arch === process.arch) {
    const electron = require("electron");
    run(electron, [path.join(__dirname, "verify-standalone-runtime.js")], { cwd: root });
  } else {
    console.log(`Skipping executable standalone smoke test for cross target ${target.key}; binary format is validated after packaging.`);
  }

  const builder = path.join(root, "node_modules", "electron-builder", "out", "cli", "cli.js");
  if (!fs.existsSync(builder)) throw new Error(`electron-builder CLI is missing at ${builder}.`);
  const builderArgs = [builder, target.platform === "win32" ? "--win" : "--mac", `--${target.arch}`];
  if (directoryOnly) builderArgs.push("--dir");
  run(process.execPath, builderArgs, { cwd: root });
  if (target.platform === "win32") {
    const verifyArgs = [path.join(__dirname, "verify-windows-package.mjs"), target.arch];
    if (directoryOnly) verifyArgs.push("--dir");
    run(process.execPath, verifyArgs, { cwd: root });
  } else {
    run(process.execPath, [path.join(__dirname, "verify-macos-package.js"), target.arch], { cwd: root });
  }
  console.log(`MoneyPot ${target.key} ${directoryOnly ? "directory" : "release"} build completed and passed native dependency validation.`);
} finally {
  run(process.execPath, [path.join(__dirname, "ensure-native.js")], { cwd: root });
}
