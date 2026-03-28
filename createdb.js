const sqlite3 = require("sqlite3").verbose();
// Connecting to or creating a new SQLite database file
const db = new sqlite3.Database(
  "./collection.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      return console.error(err.message);
    }
  }
);

// Serialize method ensures that database queries are executed sequentially
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS transactions (
        transid INTEGER PRIMARY KEY,
        type TEXT,
        category TEXT,
        description TEXT,
        date DATE,
        amount INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS recurring (
        recurid INTEGER PRIMARY KEY,
        amount INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS budget (
        budgetid INTEGER PRIMARY KEY,
        startdate TEXT,
        enddate TEXT,
        amount INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users (
        userid INTEGER PRIMARY KEY,
        name TEXT,
        age INTEGER,
        mail TEXT,
        password TEXT,
        image TEXT
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS categories (
        categoryid INTEGER PRIMARY KEY,
        type TEXT,
        imgpath TEXT,
        name TEXT,
        fill TEXT
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users_transcation_link (
        userid INTEGER,
        transid INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users_recurring_link (
        userid INTEGER,
        recurrid INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users_budget_link (
        userid INTEGER,
        budgetid INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users_category_link (
        userid INTEGER,
        categorykid INTEGER
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );

  // Insert dummy data into the categories table
  db.run(
    `INSERT INTO categories (type, imgpath, name, fill) VALUES
    ('Debit', '/house.png', 'Rent', '#FF5733'),
    ('Debit', '/apparal.png', 'Apparel', '#33FF57'),
    ('Debit', '/food.png', 'Food', '#FF33A1'),
    ('Debit', '/shopping.png', 'Shopping', '#8C33FF'),
    ('Debit', '/utilities.png', 'Utilities', '#33FFA1'),
    ('Debit', '/healthcare.png', 'Health Care', '#A133FF'),
    ('Debit', '/personalcare.png', 'Personal Care', '#FF8C33'),
    ('Debit', '/entertainment.png', 'Entertainment', '#33FF8C'),
    ('Debit', '/transportation.png', 'Transportation', '#3357FF'),
    ('Debit', '/misallaneous.png', 'Miscellaneous', '#FF338C'),
    ('Credit', '/Salary.png', 'Salary', '#33FF8C'),
    ('Credit', '/friend.png', 'Friends', '#8CFF33'),
    ('Credit', '/external.png', 'External', '#FF8333')`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
    }
  );
});