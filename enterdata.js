// Connecting to or creating a new SQLite database file
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(
  "./collection.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Connected to the SQLite database.");
  }
);

// Serialize method ensures that database queries are executed sequentially
db.serialize(() => {
  // Insert dummy data into the users table
  // db.run(
  //   `INSERT INTO users (name, age, mail, password, image) VALUES
  //     ('jatin', 23, 'jatin@gmail.com', '123', "/wom.jpeg")`,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into users table.");
  //   }
  // );



  // Insert dummy data into the transactions table
  // db.run(
  //   `INSERT INTO transactions (type, category, description, date, amount) VALUES
  //     ('Credit',  'Entertainment','Salary', '2024-07-01', 5000),
  //     ('Debit',  'Food','Groceries', '2024-07-02', 200),
  //     ('Debit',  'Entertainment','Salary', '2024-07-03', 300),
  //     ('Debit',  'Food','Groceries', '2024-07-04', 200),
  //     ('Credit',  'Entertainment','Salary', '2024-07-05', 500),
  //     ('Debit',  'Food','Groceries', '2024-07-06', 200),
  //     ('Debit',  'Entertainment','Salary', '2024-07-07', 100),
  //     ('Debit',  'Food','Groceries', '2024-07-08', 200)
  //     `,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into transactions table.");
  //   }
  // );

  // // Insert dummy data into the recurring table
  // db.run(
  //   `INSERT INTO recurring (amount) VALUES
  //     (100),
  //     (200)`,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into recurring table.");
  //   }
  // );

  // // Insert dummy data into the budget table
  // db.run(
  //   `INSERT INTO budget (startdate, enddate, amount) VALUES
  //     ('2024-07-01', '2024-07-31', 2000),
  //     ('2024-08-01', '2024-08-31', 2500)`,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into budget table.");
  //   }
  // );

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
    ('Credit', '/external.png', 'External', '#FF8333')
     `,
    (err) => {
      if (err) {
        return console.error(err.message);
      }
      console.log("Inserted data into categories table.");
    }
  );

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////



  // Link users to transactions
  // db.run(
  //   `INSERT INTO users_transcation_link (userid, transid) VALUES
  //     (1, 1),
      
  // (1,3),
  // (1,4),
  // (1,5),
  // (1,6),
  // (1,7),
  // (1,8)
  // `,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into users_transcation_link table.");
  //   }
  // );

  // //   // Link users to recurring
  // db.run(
  //   `INSERT INTO users_recurring_link (userid, recurrid) VALUES
  //     (1, 1)`,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into users_recurring_link table.");
  //   }
  // );

  // // Link users to budget
  // db.run(
  //   `INSERT INTO users_budget_link (userid, budgetid) VALUES
  //     (1, 1)`,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into users_budget_link table.");
  //   }
  // );

  // // Link users to categories
  // db.run(
  //   `INSERT INTO users_category_link (userid, categorykid) VALUES
  //     (1, 1),
      
  //     (1,2)
  //     `,
  //   (err) => {
  //     if (err) {
  //       return console.error(err.message);
  //     }
  //     console.log("Inserted data into users_category_link table.");
  //   }
  // );
});

db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Closed the database connection.");
});
