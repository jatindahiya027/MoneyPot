import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openDatabase } from "../src/libs/betterSqlite3.mjs";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "moneypot-database-"));
const filename = path.join(directory, "collection.db");
try {
  const db = await openDatabase(filename);
  await db.exec("PRAGMA journal_mode=WAL; CREATE TABLE users(userid INTEGER PRIMARY KEY, mail TEXT UNIQUE NOT NULL);");
  const created = await db.run("INSERT INTO users(mail) VALUES(?)", ["fresh-install@moneypot.local"]);
  assert.equal(created.lastID, 1);
  assert.deepEqual(await db.get("SELECT userid,mail FROM users WHERE userid=?", [created.lastID]), {
    userid: 1,
    mail: "fresh-install@moneypot.local",
  });
  await db.close();
  assert.equal((await fs.stat(filename)).isFile(), true);
  console.log("better-sqlite3 first-launch create/write/read/close verified.");
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
