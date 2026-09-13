import fs from "node:fs/promises";
import path from "node:path";
import { openDatabase } from "../src/libs/betterSqlite3.mjs";
import { repairTransactionCategoryLinks } from "../src/libs/categoryIntegrity.mjs";

const filename = path.resolve(process.argv[2] || "collection.db");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backup = `${filename}.before-category-repair-${stamp}.bak`;
await fs.copyFile(filename, backup);

let db;
try {
  db = await openDatabase(filename);
  await db.exec("PRAGMA busy_timeout=5000;");
  const repaired = await repairTransactionCategoryLinks(db);
  console.log(JSON.stringify({ repaired, backup }));
} catch (error) {
  console.error(error.stack || error);
  console.error(`The original backup is available at ${backup}`);
  process.exitCode = 1;
} finally {
  if (db) await db.close();
}
