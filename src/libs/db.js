import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const DB_PATH = path.join(process.cwd(), "collection.db");

let db = null;

// ── Date migration: fix any non-ISO dates already in the DB ──────────────────
async function migrateDatesToISO(db) {
  // Fix YYYY-DD-MM → YYYY-MM-DD
  await db.run(`
    UPDATE transactions
    SET date = substr(date,1,5)||substr(date,9,2)||'-'||substr(date,6,2)
    WHERE length(date)=10
      AND substr(date,5,1)='-' AND substr(date,8,1)='-'
      AND CAST(substr(date,6,2) AS INTEGER)>12
  `);
  // Fix DD/MM/YYYY → YYYY-MM-DD
  await db.run(`
    UPDATE transactions
    SET date = substr(date,7,4)||'-'||substr(date,4,2)||'-'||substr(date,1,2)
    WHERE length(date)=10
      AND substr(date,3,1)='/' AND substr(date,6,1)='/'
      AND CAST(substr(date,7,4) AS INTEGER)>=1900
  `);
  // Fix DD-MM-YYYY → YYYY-MM-DD
  await db.run(`
    UPDATE transactions
    SET date = substr(date,7,4)||'-'||substr(date,4,2)||'-'||substr(date,1,2)
    WHERE length(date)=10
      AND substr(date,3,1)='-' AND substr(date,6,1)='-'
      AND CAST(substr(date,7,4) AS INTEGER)>=1900
      AND CAST(substr(date,1,2) AS INTEGER)<=31
      AND CAST(substr(date,4,2) AS INTEGER)<=12
  `);

  // Safe migration: add bank_name column to existing databases
  try {
    await db.run("ALTER TABLE transactions ADD COLUMN bank_name TEXT DEFAULT ''");
  } catch {
    // Column already exists — ignore
  }
}

export async function getDb() {
  if (db) return db;

  db = await open({ filename: DB_PATH, driver: sqlite3.Database });

  // WAL mode for better concurrent read performance
  await db.exec("PRAGMA journal_mode=WAL;");

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transid     INTEGER PRIMARY KEY,
      type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit')),
      category    TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      date        TEXT    NOT NULL,
      amount      REAL    NOT NULL CHECK(amount >= 0),
      bank_name   TEXT    DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS recurring (
      recurid     INTEGER PRIMARY KEY,
      userid      INTEGER NOT NULL,
      name        TEXT    NOT NULL,
      type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit')),
      category    TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      amount      REAL    NOT NULL CHECK(amount >= 0),
      frequency   TEXT    NOT NULL DEFAULT 'monthly'
        CHECK(frequency IN ('daily','weekly','monthly','yearly')),
      next_date   TEXT    NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS budget (
      budgetid    INTEGER PRIMARY KEY,
      userid      INTEGER NOT NULL,
      category    TEXT    NOT NULL,
      month       TEXT    NOT NULL,
      amount      REAL    NOT NULL CHECK(amount >= 0),
      UNIQUE(userid, category, month)
    );
    CREATE TABLE IF NOT EXISTS users (
      userid   INTEGER PRIMARY KEY,
      name     TEXT    NOT NULL,
      age      INTEGER,
      mail     TEXT    NOT NULL UNIQUE,
      password TEXT    NOT NULL,
      image    TEXT    DEFAULT '/profile.png'
    );
    CREATE TABLE IF NOT EXISTS categories (
      categoryid INTEGER PRIMARY KEY,
      type       TEXT,
      imgpath    TEXT,
      name       TEXT,
      fill       TEXT
    );
    CREATE TABLE IF NOT EXISTS users_transcation_link (
      userid  INTEGER NOT NULL,
      transid INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users_category_link (
      userid      INTEGER NOT NULL,
      categorykid INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reset_tokens (
      tokenid   INTEGER PRIMARY KEY,
      userid    INTEGER NOT NULL,
      token     TEXT    NOT NULL UNIQUE,
      expires   TEXT    NOT NULL,
      used      INTEGER NOT NULL DEFAULT 0
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_trans_link_userid  ON users_transcation_link(userid);
    CREATE INDEX IF NOT EXISTS idx_trans_date         ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_trans_type         ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_recurring_userid   ON recurring(userid);
    CREATE INDEX IF NOT EXISTS idx_budget_userid      ON budget(userid);
    CREATE INDEX IF NOT EXISTS idx_reset_token        ON reset_tokens(token);

    CREATE TABLE IF NOT EXISTS savings_goals (
      goalid        INTEGER PRIMARY KEY,
      userid        INTEGER NOT NULL,
      name          TEXT    NOT NULL,
      target_amount REAL    NOT NULL CHECK(target_amount > 0),
      saved_amount  REAL    NOT NULL DEFAULT 0,
      deadline      TEXT,
      color         TEXT    DEFAULT '#22c55e',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_goals_userid ON savings_goals(userid);
  `);

  await migrateDatesToISO(db);
  return db;
}
