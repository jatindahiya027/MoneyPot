const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { TARGETS } = require("./native-runtime-config");
const { assertNativeTarget } = require("./native-deps");
const { removeSharpPackages } = require("./remove-sharp");

const root = path.resolve(__dirname, "..");
const target = process.argv[2];
const config = TARGETS[target];
if (!config) throw new Error(`Unknown native dependency target: ${target}`);

function packageDir(packageName) {
  return path.join(root, "node_modules", ...packageName.split("/"));
}

async function main() {
  // A same-CPU binary from another OS must never be reused by electron-rebuild.
  fs.rmSync(path.join(root, "node_modules", "better-sqlite3", "build"), { recursive: true, force: true });
  const removedSharp = removeSharpPackages(root);
  if (removedSharp.length) console.log(`Removed ${removedSharp.length} unused Sharp runtime package(s).`);
  const betterRoot = packageDir("better-sqlite3");
  const installer = require.resolve("prebuild-install/bin.js", { paths: [root] });
  const electronVersion = require(path.join(root, "node_modules", "electron", "package.json")).version;
  const result = spawnSync(process.execPath, [
    installer,
    "--runtime=electron",
    `--target=${electronVersion}`,
    `--platform=${config.platform}`,
    `--arch=${config.arch}`,
    "--force",
  ], { cwd: betterRoot, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Could not install better-sqlite3 for Electron ${electronVersion} ${target}.`);
  const betterBinary = path.join(betterRoot, "build", "Release", "better_sqlite3.node");
  assertNativeTarget(betterBinary, target);
  console.log(`Verified better-sqlite3 Electron ${electronVersion} binary for ${target}.`);
  console.log(`Native dependencies prepared for ${target}.`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
