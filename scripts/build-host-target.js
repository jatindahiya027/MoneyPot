const path = require("node:path");
const { reexecWithNode22, run } = require("./node22-runtime");

reexecWithNode22(__filename, process.argv.slice(2));
const target = `${process.platform}-${process.arch}`;
if (!new Set(["darwin-arm64", "darwin-x64", "win32-arm64", "win32-x64"]).has(target)) {
  throw new Error(`Unsupported desktop build host: ${target}.`);
}
run(process.execPath, [path.join(__dirname, "build-desktop-target.js"), target, ...process.argv.slice(2)]);
