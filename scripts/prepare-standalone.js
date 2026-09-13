const fs = require("node:fs");
const path = require("node:path");
const { TARGETS } = require("./native-runtime-config");
const { assertNativeTarget } = require("./native-deps");
const { removeSharpPackages } = require("./remove-sharp");

const root = path.resolve(__dirname, "..");
const target = process.argv[2];
if (!TARGETS[target]) throw new Error(`Unknown standalone target: ${target}`);

const runtime = path.join(root, ".next", "standalone");
const sourcePublic = path.join(root, "public");
const runtimePublic = path.join(runtime, "public");
const sourceStatic = path.join(root, ".next", "static");
const runtimeStatic = path.join(runtime, ".next", "static");
const sourceNative = path.join(root, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
const runtimeNative = path.join(runtime, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");

function copyDirectory(source, destination, filter) {
  if (!fs.existsSync(source)) throw new Error(`Required standalone source is missing: ${source}`);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true, filter });
}

if (!fs.existsSync(path.join(runtime, "server.js"))) {
  throw new Error("Next standalone output is missing. Run `npm run build` before preparing a desktop package.");
}

copyDirectory(sourceStatic, runtimeStatic);
copyDirectory(sourcePublic, runtimePublic, (source) => {
  const relative = path.relative(sourcePublic, source);
  if (!relative) return true;
  const firstSegment = relative.split(path.sep)[0];
  return firstSegment !== "uploads" && path.basename(source) !== ".DS_Store";
});

fs.mkdirSync(path.dirname(runtimeNative), { recursive: true });
fs.copyFileSync(sourceNative, runtimeNative);
assertNativeTarget(runtimeNative, target);

const removedSharp = removeSharpPackages(root);
if (removedSharp.length) console.log(`Removed ${removedSharp.length} unused Sharp runtime package(s).`);
console.log(`Prepared minimal Next standalone runtime for ${target}.`);
