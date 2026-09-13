import path from "path";
import { ensureDefaultCategories } from "./defaultCategories";
import { openDatabase } from "./betterSqlite3.mjs";
import { ensureOllamaPreferenceColumns } from "@/lib/userPreferencesSchema.mjs";
import { repairTransactionCategoryLinks } from "./categoryIntegrity.mjs";

const DB_PATH = path.join(process.env.MONEYPOT_DATA_DIR || process.cwd(), "collection.db");

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

async function migratePinPreferences(db) {
  let columns = await db.all("PRAGMA table_info(user_preferences)");
  const names = await ensureOllamaPreferenceColumns(db);
  columns = await db.all("PRAGMA table_info(user_preferences)");
  const expected = [
    "userid", "default_bank", "banks", "pin_enabled", "pin_prompted",
    "pin_hash", "pin_failed_attempts", "pin_locked_until", "updated_at",
    "ollama_url", "ollama_model",
  ];

  if (expected.some(name => !names.has(name)) || columns.some(column => !expected.includes(column.name))) {
    const value = (name, fallback) => names.has(name) ? name : fallback;
    await db.exec("BEGIN IMMEDIATE");
    try {
      await db.exec(`
        CREATE TABLE user_preferences_pin_migration (
          userid INTEGER PRIMARY KEY,
          default_bank TEXT DEFAULT '',
          banks TEXT DEFAULT '[]',
          pin_enabled INTEGER NOT NULL DEFAULT 0,
          pin_prompted INTEGER NOT NULL DEFAULT 0,
          pin_hash TEXT NOT NULL DEFAULT '',
          pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
          pin_locked_until INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          ollama_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
          ollama_model TEXT NOT NULL DEFAULT 'llama3.2'
        );
        INSERT INTO user_preferences_pin_migration
          (userid, default_bank, banks, pin_enabled, pin_prompted, pin_hash,
           pin_failed_attempts, pin_locked_until, updated_at, ollama_url, ollama_model)
        SELECT userid,
          ${value("default_bank", "''")}, ${value("banks", "'[]'")},
          ${value("pin_enabled", "0")}, ${value("pin_prompted", "0")},
          ${value("pin_hash", "''")}, ${value("pin_failed_attempts", "0")},
          ${value("pin_locked_until", "0")}, ${value("updated_at", "datetime('now')")},
          ${value("ollama_url", "'http://127.0.0.1:11434'")}, ${value("ollama_model", "'llama3.2'")}
        FROM user_preferences;
        DROP TABLE user_preferences;
        ALTER TABLE user_preferences_pin_migration RENAME TO user_preferences;
        COMMIT;
      `);
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }
  }

  // Remove tables from the retired device-authentication implementation.
  await db.exec("DROP TABLE IF EXISTS webauthn_challenges; DROP TABLE IF EXISTS webauthn_credentials;");
}

async function migrateInvestmentEntity(db) {
  const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'");
  if (!schema?.sql || schema.sql.includes("'Investment'")) return;

  await db.exec("BEGIN IMMEDIATE");
  try {
    await db.exec(`
      ALTER TABLE transactions RENAME TO transactions_legacy;
      CREATE TABLE transactions (
        transid     INTEGER PRIMARY KEY,
        type        TEXT NOT NULL CHECK(type IN ('Debit','Credit','Investment')),
        category    TEXT NOT NULL,
        description TEXT DEFAULT '',
        date        TEXT NOT NULL,
        amount      REAL NOT NULL,
        bank_name   TEXT DEFAULT ''
      );
      INSERT INTO transactions (transid,type,category,description,date,amount,bank_name)
      SELECT transid,
        CASE
          WHEN type='Debit' AND lower(COALESCE(category,'')) LIKE '%investment%' THEN 'Investment'
          WHEN type='Credit' AND lower(COALESCE(category,'')) LIKE '%investment%'
            AND lower(COALESCE(category,'')) LIKE '%redemption%' THEN 'Investment'
          ELSE type
        END,
        category, description, date,
        CASE WHEN type='Credit' AND lower(COALESCE(category,'')) LIKE '%investment%'
          AND lower(COALESCE(category,'')) LIKE '%redemption%' THEN -ABS(amount) ELSE amount END,
        bank_name
      FROM transactions_legacy;
      DROP TABLE transactions_legacy;
      COMMIT;
    `);
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

async function migrateTransactionAmountConstraint(db) {
  const schema = await db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'");
  if (!schema?.sql || !/CHECK\s*\(\s*amount\s*>=\s*0\s*\)/i.test(schema.sql)) return;
  await db.exec("BEGIN IMMEDIATE");
  try {
    await db.exec(`
      ALTER TABLE transactions RENAME TO transactions_amount_legacy;
      CREATE TABLE transactions (
        transid INTEGER PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('Debit','Credit','Investment')),
        category TEXT NOT NULL,
        description TEXT DEFAULT '',
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        bank_name TEXT DEFAULT ''
      );
      INSERT INTO transactions SELECT transid,type,category,description,date,amount,bank_name
      FROM transactions_amount_legacy;
      DROP TABLE transactions_amount_legacy;
      COMMIT;
    `);
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function getDb() {
  if (db) return db;

  db = await openDatabase(DB_PATH);

  // WAL mode for better concurrent read performance
  await db.exec("PRAGMA journal_mode=WAL;");
  await db.exec("PRAGMA foreign_keys=ON;");
  await db.exec("PRAGMA busy_timeout=5000;");

  await migrateInvestmentEntity(db);
  await migrateTransactionAmountConstraint(db);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transid     INTEGER PRIMARY KEY,
      type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit','Investment')),
      category    TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      date        TEXT    NOT NULL,
      amount      REAL    NOT NULL,
      bank_name   TEXT    DEFAULT ''
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
    CREATE TABLE IF NOT EXISTS user_preferences (
      userid       INTEGER PRIMARY KEY,
      default_bank TEXT DEFAULT '',
      banks        TEXT DEFAULT '[]',
      pin_enabled INTEGER NOT NULL DEFAULT 0,
      pin_prompted INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT NOT NULL DEFAULT '',
      pin_failed_attempts INTEGER NOT NULL DEFAULT 0,
      pin_locked_until INTEGER NOT NULL DEFAULT 0,
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      ollama_url   TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
      ollama_model TEXT NOT NULL DEFAULT 'llama3.2'
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_trans_link_userid  ON users_transcation_link(userid);
    CREATE INDEX IF NOT EXISTS idx_trans_link_transid ON users_transcation_link(transid);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_trans_link_unique ON users_transcation_link(userid, transid);
    CREATE INDEX IF NOT EXISTS idx_category_link_userid ON users_category_link(userid);
    CREATE INDEX IF NOT EXISTS idx_trans_date         ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_trans_type         ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_trans_bank         ON transactions(bank_name);
    CREATE INDEX IF NOT EXISTS idx_trans_category     ON transactions(category);
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

  await db.run(`
    DELETE FROM users_category_link
    WHERE rowid NOT IN (
      SELECT MIN(rowid) FROM users_category_link GROUP BY userid, categorykid
    )
  `);
  await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_category_link_unique ON users_category_link(userid, categorykid);");

  await migratePinPreferences(db);

  await db.run("UPDATE categories SET type='Investment' WHERE lower(COALESCE(name,'')) LIKE '%investment%'");
  await ensureDefaultCategories(db);

  await migrateDatesToISO(db);
  await repairTransactionCategoryLinks(db);
  return db;
}
