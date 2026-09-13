const fs = require("node:fs");
const path = require("node:path");
const { binaryInfo } = require("./native-deps");
const { TARGETS } = require("./native-runtime-config");
const { assertNoSharpPackages } = require("./remove-sharp");
const { auditPackagedApp } = require("./verify-package-size");

function findFiles(root, predicate) {
  if (!fs.existsSync(root)) return [];
  const found = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(full);
      else if (predicate(full)) found.push(full);
    }
  }
  return found;
}

function assertBinary(file, format, arch, label) {
  if (!file || !fs.existsSync(file)) throw new Error(`Missing packaged ${label}: ${file || "not found"}`);
  const actual = binaryInfo(file);
  if (actual.format !== format || actual.arch !== arch) {
    throw new Error(`${label} mismatch: expected ${format}-${arch}, found ${actual.format}-${actual.arch} at ${file}`);
  }
}

function validate(context) {
  const arch = { 1: "x64", 3: "arm64" }[context.arch];
  const target = `${context.electronPlatformName}-${arch}`;
  const config = TARGETS[target];
  if (!config) throw new Error(`Unsupported packaged target: ${target}`);
  const product = context.packager.appInfo.productFilename;
  const resources = config.platform === "darwin"
    ? path.join(context.appOutDir, `${product}.app`, "Contents", "Resources")
    : path.join(context.appOutDir, "resources");
  const executable = config.platform === "darwin"
    ? path.join(context.appOutDir, `${product}.app`, "Contents", "MacOS", product)
    : path.join(context.appOutDir, `${product}.exe`);
  const appRoot = path.join(resources, "app");
  const nodeModules = path.join(appRoot, ".next", "standalone", "node_modules");
  const format = config.platform === "win32" ? "pe" : "macho";
  assertBinary(executable, format, config.arch, "Electron executable");
  const better = path.join(nodeModules, "better-sqlite3", "build", "Release", "better_sqlite3.node");
  assertBinary(better, format, config.arch, "better-sqlite3");
  const nativeFiles = findFiles(nodeModules, (file) => file.endsWith(".node"));
  for (const file of nativeFiles) assertBinary(file, format, config.arch, path.relative(nodeModules, file));
  const packagedDatabases = findFiles(appRoot, (file) => /\.db(?:-(?:shm|wal))?$/.test(file));
  if (packagedDatabases.length) {
    throw new Error(`Packaged builds must not contain database files: ${packagedDatabases.join(", ")}`);
  }
  const packagedSecrets = findFiles(appRoot, (file) => /^\.env(?:\..+)?$/.test(path.basename(file)));
  if (packagedSecrets.length) {
    throw new Error(`Packaged builds must not contain environment files: ${packagedSecrets.join(", ")}`);
  }
  assertNoSharpPackages(appRoot);
  const audit = auditPackagedApp(appRoot);
  console.log(`Packaged native dependency audit passed: ${target} (${nativeFiles.length} native modules, ${audit.sizeMiB} MiB app payload).`);
}

exports.afterPack = async (context) => validate(context);
exports.validatePackagedTarget = validate;
