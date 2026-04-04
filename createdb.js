// createdb.js — initialises the SQLite database
// Run: node createdb.js
// Safe to re-run — all statements use IF NOT EXISTS / ON CONFLICT

const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(
  "./collection.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => { if (err) return console.error(err.message); }
);

db.serialize(() => {
  // WAL mode for better concurrency
  db.run("PRAGMA journal_mode=WAL;");

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    transid     INTEGER PRIMARY KEY,
    type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit')),
    category    TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    date        TEXT    NOT NULL,
    amount      REAL    NOT NULL CHECK(amount >= 0)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recurring (
    recurid     INTEGER PRIMARY KEY,
    userid      INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('Debit','Credit')),
    category    TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    amount      REAL    NOT NULL CHECK(amount >= 0),
    frequency   TEXT    NOT NULL DEFAULT 'monthly',
    next_date   TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS budget (
    budgetid  INTEGER PRIMARY KEY,
    userid    INTEGER NOT NULL,
    category  TEXT    NOT NULL,
    month     TEXT    NOT NULL,
    amount    REAL    NOT NULL CHECK(amount >= 0),
    UNIQUE(userid, category, month)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    userid   INTEGER PRIMARY KEY,
    name     TEXT NOT NULL,
    age      INTEGER,
    mail     TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    image    TEXT DEFAULT '/profile.png'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    categoryid INTEGER PRIMARY KEY,
    type       TEXT,
    imgpath    TEXT,
    name       TEXT,
    fill       TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users_transcation_link (
    userid  INTEGER NOT NULL,
    transid INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users_category_link (
    userid      INTEGER NOT NULL,
    categorykid INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
    tokenid INTEGER PRIMARY KEY,
    userid  INTEGER NOT NULL,
    token   TEXT    NOT NULL UNIQUE,
    expires TEXT    NOT NULL,
    used    INTEGER NOT NULL DEFAULT 0
  )`);

  // Indexes
  db.run("CREATE INDEX IF NOT EXISTS idx_trans_link_userid ON users_transcation_link(userid)");
  db.run("CREATE INDEX IF NOT EXISTS idx_trans_date        ON transactions(date)");
  db.run("CREATE INDEX IF NOT EXISTS idx_recurring_userid  ON recurring(userid)");
  db.run("CREATE INDEX IF NOT EXISTS idx_budget_userid     ON budget(userid)");
  db.run("CREATE INDEX IF NOT EXISTS idx_reset_token       ON reset_tokens(token)");

  // Default categories (skip if already seeded)
  db.get("SELECT COUNT(*) AS cnt FROM categories", (err, row) => {
    if (err || row.cnt > 0) return;
    db.run(`INSERT INTO categories (type,imgpath,name,fill) VALUES
      ('Debit','/house.png','Rent','#FF5733'),
      ('Debit','/apparal.png','Apparel','#33FF57'),
      ('Debit','/food.png','Food','#FF33A1'),
      ('Debit','/shopping.png','Shopping','#8C33FF'),
      ('Debit','/utilities.png','Utilities','#33FFA1'),
      ('Debit','/healthcare.png','Health Care','#A133FF'),
      ('Debit','/personalcare.png','Personal Care','#FF8C33'),
      ('Debit','/entertainment.png','Entertainment','#33FF8C'),
      ('Debit','/transportation.png','Transportation','#3357FF'),
      ('Debit','/misallaneous.png','Miscellaneous','#FF338C'),
      ('Credit','/Salary.png','Salary','#33FF8C'),
      ('Credit','/friend.png','Friends','#8CFF33'),
      ('Credit','/external.png','External','#FF8333')`
    );
    console.log("Default categories seeded.");
  });

  console.log("Database initialised successfully.");
});
