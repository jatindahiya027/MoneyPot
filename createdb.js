const sqlite3 = require("sqlite3").verbose();

// Connecting to or creating a new SQLite database file
const db = new sqlite3.Database(
  "./collection.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Connected to the SQlite database.");
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
      console.log("Created transcations table.");
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
      console.log("Created recurring table.");
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
      console.log("Created Budget table.");
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
      console.log("Created users table.");
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
      console.log("Created categories table.");
    }
  );

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////


  db.run(
    `CREATE TABLE IF NOT EXISTS users_transcation_link (
        userid INTEGER,
        transid INTEGER   
      )`,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log("Created users_transcation_link table.");
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
      console.log("Created users_recurring_link table.");
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
      console.log("Created users_budget_link table.");
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
      console.log("Created users_category_link table.");
    }
  );
});
