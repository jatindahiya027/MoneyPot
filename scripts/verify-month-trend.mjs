import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openDatabase } from "../src/libs/betterSqlite3.mjs";
import {
  listRecentMonths,
  queryMonthlyDebitCategories,
  queryMonthlyTotals,
} from "../src/lib/monthTrendQueries.mjs";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "moneypot-monthtrend-"));
const filename = path.join(directory, "collection.db");

try {
  const db = await openDatabase(filename);
  await db.exec(`
    CREATE TABLE transactions (
      transid INTEGER PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      bank_name TEXT DEFAULT ''
    );
    CREATE TABLE users_transcation_link (userid INTEGER NOT NULL, transid INTEGER NOT NULL);
    INSERT INTO transactions (transid,type,category,date,amount) VALUES
      (1,'Credit','Salary','2026-02-02',100000),
      (2,'Debit','Food','2026-02-03',20000),
      (3,'Investment','Mutual Fund','2026-02-04',10000),
      (4,'Debit','Rent','2026-06-01',30000),
      (5,'Credit','Opening balance','2026-06-01',999999),
      (6,'Debit','Self transfer','2026-06-02',7000),
      (7,'Credit','Salary','2026-08-01',200000),
      (8,'Debit','Food','2026-02-05',50000);
    INSERT INTO users_transcation_link (userid,transid) VALUES
      (1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(2,8);
  `);

  const totals = await queryMonthlyTotals(db, 1, "2026-02", "2026-07");
  assert.deepEqual(totals, [
    { month: "2026-02", income: 100000, expenses: 20000, investment: 10000 },
    { month: "2026-06", income: 0, expenses: 30000, investment: 0 },
  ]);

  const categories = await queryMonthlyDebitCategories(db, 1, "2026-02", "2026-07");
  assert.deepEqual(categories, [
    { month: "2026-02", category: "Food", total: 20000 },
    { month: "2026-06", category: "Rent", total: 30000 },
  ]);

  assert.deepEqual(listRecentMonths(6, new Date(2026, 6, 14)), [
    "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07",
  ]);

  await db.close();
  console.log("Month trend queries verified: ownership, date bounds, exclusions, totals, and categories.");
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
