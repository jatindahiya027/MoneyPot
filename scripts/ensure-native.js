const fs = require("node:fs");
const path = require("node:path");
const { binaryInfo } = require("./native-deps");
const { npmExecutable, reexecWithNode22, run } = require("./node22-runtime");

reexecWithNode22(__filename, process.argv.slice(2));

const root = path.resolve(__dirname, "..");
const binary = path.join(root, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
const expectedFormat = process.platform === "darwin" ? "macho" : process.platform === "win32" ? "pe" : "elf";

function runtimeWorks() {
  try {
    if (!fs.existsSync(binary)) return false;
    const info = binaryInfo(binary);
    if (info.format !== expectedFormat || info.arch !== process.arch) return false;
    delete require.cache[require.resolve("better-sqlite3")];
    const Database = require("better-sqlite3");
    const db = new Database(":memory:");
    const value = db.prepare("SELECT 1 AS value").get().value;
    db.close();
    return value === 1;
  } catch {
    return false;
  }
}

if (!runtimeWorks()) {
  console.log("Restoring better-sqlite3 for the host Node 22 runtime...");
  fs.rmSync(path.join(root, "node_modules", "better-sqlite3", "build"), { recursive: true, force: true });
  run(npmExecutable(), ["rebuild", "better-sqlite3"], { cwd: root });
}
if (!runtimeWorks()) throw new Error("better-sqlite3 host runtime validation failed after rebuild.");
const info = binaryInfo(binary);
console.log(`Host better-sqlite3 ready: ${info.format}-${info.arch}, Node ABI ${process.versions.modules}.`);
