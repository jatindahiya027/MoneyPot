const fs = require("node:fs");
const path = require("node:path");
const { npmExecutable, reexecWithNode22, run } = require("./node22-runtime");
const { removeSharpPackages } = require("./remove-sharp");

reexecWithNode22(__filename, process.argv.slice(2));

const root = path.resolve(__dirname, "..");
const nodeModules = path.join(root, "node_modules");

console.log(`Installing locked dependencies with Node ${process.versions.node}...`);
fs.rmSync(nodeModules, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
run(npmExecutable(), ["ci"], { cwd: root });
const removedSharp = removeSharpPackages(root);
if (removedSharp.length) console.log(`Removed ${removedSharp.length} unused Sharp runtime package(s).`);

for (const required of ["better-sqlite3/package.json", "electron/package.json", "electron-builder/package.json", "next/package.json"]) {
  require.resolve(required, { paths: [root] });
}
run(process.execPath, [path.join(root, "scripts", "verify-database-runtime.mjs")], { cwd: root });
console.log("MoneyPot dependencies are clean, complete, and SQLite-ready.");
