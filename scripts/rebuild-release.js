const fs = require("node:fs");
const path = require("node:path");
const { npmExecutable, reexecWithNode22, run } = require("./node22-runtime");
const { TARGETS } = require("./native-runtime-config");

reexecWithNode22(__filename, process.argv.slice(2));

const root = path.resolve(__dirname, "..");
const packageJson = require(path.join(root, "package.json"));
const configuredOutput = packageJson.build?.directories?.output;
if (!configuredOutput) throw new Error("package.json does not define build.directories.output.");

const releaseDirectory = path.resolve(root, configuredOutput);
const relativeTarget = path.relative(root, releaseDirectory);
if (!relativeTarget || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
  throw new Error(`Refusing to delete an unsafe release path: ${releaseDirectory}`);
}

if (fs.existsSync(releaseDirectory)) {
  console.log(`Deleting current release directory: ${releaseDirectory}`);
  fs.rmSync(releaseDirectory, { recursive: true, force: true });
} else {
  console.log(`Release directory does not exist yet: ${releaseDirectory}`);
}

console.log("Starting a clean MoneyPot desktop release build...");
run(npmExecutable(), ["run", "build"], { cwd: root });

const failures = [];
for (const target of Object.keys(TARGETS)) {
  console.log(`\nBuilding release target: ${target}`);
  try {
    run(process.execPath, [
      path.join(__dirname, "build-desktop-target.js"),
      target,
      "--skip-next-build",
    ], { cwd: root });
  } catch (error) {
    failures.push({ target, message: error.message });
    console.error(`Release target failed: ${target}: ${error.message}`);
  }
}

const hostTarget = `${process.platform}-${process.arch}`;
if (TARGETS[hostTarget]) {
  console.log(`\nRestoring the local standalone runtime for this host: ${hostTarget}`);
  try {
    run(process.execPath, [path.join(__dirname, "prepare-native-deps.js"), hostTarget], { cwd: root });
    run(process.execPath, [path.join(__dirname, "prepare-standalone.js"), hostTarget], { cwd: root });
  } catch (error) {
    failures.push({ target: `${hostTarget} local runtime`, message: error.message });
  } finally {
    run(process.execPath, [path.join(__dirname, "ensure-native.js")], { cwd: root });
  }
}

if (failures.length) {
  const summary = failures.map(failure => `${failure.target}: ${failure.message}`).join("\n");
  throw new Error(`One or more release targets failed:\n${summary}`);
}

console.log(`All ${Object.keys(TARGETS).length} MoneyPot release targets completed successfully.`);
