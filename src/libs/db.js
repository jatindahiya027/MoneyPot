import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "collection.db");

let db = null;

/**
 * One-time migration: fixes any dates NOT stored as YYYY-MM-DD.
 *
 * Two cases are handled:
 *
 * 1. YYYY-DD-MM  (e.g. "2024-25-01") — legacy broken format.
 *    Detected when the middle segment (positions 6-7) is > 12,
 *    meaning it cannot be a month and must be a day.
 *    Fix: swap middle and last segments.
 *
 * 2. DD/MM/YYYY or DD-MM-YYYY  (e.g. "25/01/2024" or "25-01-2024").
 *    Detected by the separator being / or - and the year appearing last.
 *    Fix: rearrange to YYYY-MM-DD.
 *
 * Rows already in YYYY-MM-DD are untouched. After the first run this
 * becomes a harmless no-op because no rows will match the WHERE clause.
 */
async function migrateDatesToISO(db) {
  // Fix YYYY-DD-MM → YYYY-MM-DD
  // Middle segment (chars 6-7) > 12 means it is a day, not a month
  await db.run(`
    UPDATE transactions
    SET date = substr(date, 1, 5)
            || substr(date, 9, 2)
            || '-'
            || substr(date, 6, 2)
    WHERE
      length(date) = 10
      AND substr(date, 5, 1) = '-'
      AND substr(date, 8, 1) = '-'
      AND CAST(substr(date, 6, 2) AS INTEGER) > 12
  `);

  // Fix DD/MM/YYYY → YYYY-MM-DD
  await db.run(`
    UPDATE transactions
    SET date = substr(date, 7, 4)
            || '-'
            || substr(date, 4, 2)
            || '-'
            || substr(date, 1, 2)
    WHERE
      length(date) = 10
      AND substr(date, 3, 1) = '/'
      AND substr(date, 6, 1) = '/'
      AND CAST(substr(date, 7, 4) AS INTEGER) >= 1900
  `);

  // Fix DD-MM-YYYY → YYYY-MM-DD
  // Only when first segment <= 31, second <= 12, and third is a 4-digit year
  await db.run(`
    UPDATE transactions
    SET date = substr(date, 7, 4)
            || '-'
            || substr(date, 4, 2)
            || '-'
            || substr(date, 1, 2)
    WHERE
      length(date) = 10
      AND substr(date, 3, 1) = '-'
      AND substr(date, 6, 1) = '-'
      AND CAST(substr(date, 7, 4) AS INTEGER) >= 1900
      AND CAST(substr(date, 1, 2) AS INTEGER) <= 31
      AND CAST(substr(date, 4, 2) AS INTEGER) <= 12
  `);
}

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transid     INTEGER PRIMARY KEY,
      type        TEXT,
      category    TEXT,
      description TEXT,
      date        TEXT,
      amount      REAL
    );
    CREATE TABLE IF NOT EXISTS recurring (
      recurid INTEGER PRIMARY KEY,
      amount  INTEGER
    );
    CREATE TABLE IF NOT EXISTS budget (
      budgetid  INTEGER PRIMARY KEY,
      startdate TEXT,
      enddate   TEXT,
      amount    INTEGER
    );
    CREATE TABLE IF NOT EXISTS users (
      userid   INTEGER PRIMARY KEY,
      name     TEXT,
      age      INTEGER,
      mail     TEXT,
      password TEXT,
      image    TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      categoryid INTEGER PRIMARY KEY,
      type       TEXT,
      imgpath    TEXT,
      name       TEXT,
      fill       TEXT
    );
    CREATE TABLE IF NOT EXISTS users_transcation_link (
      userid  INTEGER,
      transid INTEGER
    );
    CREATE TABLE IF NOT EXISTS users_recurring_link (
      userid   INTEGER,
      recurrid INTEGER
    );
    CREATE TABLE IF NOT EXISTS users_budget_link (
      userid   INTEGER,
      budgetid INTEGER
    );
    CREATE TABLE IF NOT EXISTS users_category_link (
      userid      INTEGER,
      categorykid INTEGER
    );
  `);

  // Fix any dates in the DB that are not in YYYY-MM-DD format
  await migrateDatesToISO(db);

  return db;
}