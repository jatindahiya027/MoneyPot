const assert = require("node:assert");
const path = require("node:path");

assert(process.versions.electron, "This smoke test must run with packaged Electron.");
const Database = require(path.resolve(process.argv[2]));
const db = new Database(":memory:");
db.exec("CREATE TABLE smoke(id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
const result = db.prepare("INSERT INTO smoke(value) VALUES(?)").run("ready");
assert.strictEqual(Number(result.lastInsertRowid), 1);
assert.strictEqual(db.prepare("SELECT value FROM smoke WHERE id=1").get().value, "ready");
db.close();
console.log(`Packaged better-sqlite3 runtime passed on Electron ${process.versions.electron}.`);
