import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { deleteUserData } from "../src/libs/accountDeletion.mjs";
import { openDatabase } from "../src/libs/betterSqlite3.mjs";
import { hasSignedAmounts, inferImportedTransactionType, parseStatementAmount } from "../src/lib/importTransactionType.mjs";
import { parseCSVText } from "../src/lib/csv.mjs";
import { repairTransactionCategoryLinks } from "../src/libs/categoryIntegrity.mjs";
import { isAllowedProfileImage, maskEmail, normalizeEmail } from "../src/libs/userIdentity.mjs";

const ollamaSource = await fs.readFile(new URL("../src/libs/ollama.js", import.meta.url), "utf8");
const { selectOllamaModel } = await import(`data:text/javascript;base64,${Buffer.from(ollamaSource).toString("base64")}`);

assert.equal(parseStatementAmount("(₹1,250.50)"), -1250.5);
assert.equal(hasSignedAmounts(["100", "-40", "0"]), true);
assert.equal(inferImportedTransactionType({ withdrawal: "500" }), "Debit");
assert.equal(inferImportedTransactionType({ deposit: "500" }), "Credit");
assert.equal(inferImportedTransactionType({ typeValue: "CR" }), "Credit");
assert.equal(inferImportedTransactionType({ typeValue: "DR" }), "Debit");
assert.equal(inferImportedTransactionType({ amountValue: "-42", signedAmountColumn: true }), "Debit");
assert.equal(inferImportedTransactionType({ amountValue: "42", signedAmountColumn: true }), "Credit");
assert.equal(inferImportedTransactionType({ description: "Salary credited by employer" }), "Credit");
assert.equal(inferImportedTransactionType({ description: "UPI payment fee", fallback: "Credit" }), "Debit");
assert.equal(inferImportedTransactionType({ description: "CREDIT CARD PAYMENT", fallback: "Credit" }), "Debit");
assert.equal(inferImportedTransactionType({ description: "INTEREST PAID TILL 31-AUG-2026" }), "Credit");
assert.equal(inferImportedTransactionType({ description: "Ambiguous row", fallback: "Investment" }), "Investment");
assert.deepEqual(parseCSVText('date,description,amount\n2026-01-01,"Coffee, snack",100'), [
  ["date", "description", "amount"],
  ["2026-01-01", "Coffee, snack", "100"],
]);
assert.deepEqual(parseCSVText('description,amount\n"First line\nSecond ""quoted"" line",20'), [
  ["description", "amount"],
  ['First line\nSecond "quoted" line', "20"],
]);
assert.equal(normalizeEmail("  User@Example.COM "), "user@example.com");
assert.equal(maskEmail("same.name@example.com").includes("same.name"), false);
assert.equal(isAllowedProfileImage("/uploads/ChatGPT_Image_May_17,_2025.png"), true);
assert.equal(isAllowedProfileImage("/uploads/../../secret.png"), false);

const models = [
  { name: "nomic-embed-text:latest", details: { parameter_size: "137M" } },
  { name: "llama3.2:3b", modified_at: "2026-01-01", details: { parameter_size: "3.2B" } },
  { name: "qwen3:8b", modified_at: "2025-01-01", details: { parameter_size: "8.2B" } },
];
assert.equal(selectOllamaModel(models, "llama3.2:3b").selected, "llama3.2:3b");
assert.equal(selectOllamaModel(models, "removed:latest").selected, "qwen3:8b");
assert.equal(selectOllamaModel([{ name: "nomic-embed-text:latest" }], "").selected, "");

const validationSource = await fs.readFile(new URL("../src/libs/transactionValidation.js", import.meta.url), "utf8");
const validation = await import(`data:text/javascript;base64,${Buffer.from(validationSource).toString("base64")}`);
assert.equal(validation.preservesExistingTransactionCategory(
  { type: "Credit", category: "Opening balance" },
  { type: "Credit", category: "opening BALANCE" }
), true);
assert.equal(validation.preservesExistingTransactionCategory(
  { type: "Credit", category: "Opening balance" },
  { type: "Debit", category: "Opening balance" }
), false);

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "moneypot-account-delete-"));
const filename = path.join(directory, "collection.db");
let db;
try {
  db = await openDatabase(filename);
  await db.exec(`
    CREATE TABLE users (userid INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE transactions (transid INTEGER PRIMARY KEY, amount REAL);
    CREATE TABLE users_transcation_link (userid INTEGER, transid INTEGER);
    CREATE TABLE users_category_link (userid INTEGER, categorykid INTEGER);
    CREATE TABLE categories (categoryid INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE budget (userid INTEGER);
    CREATE TABLE savings_goals (userid INTEGER);
    CREATE TABLE reset_tokens (userid INTEGER);
    CREATE TABLE user_preferences (userid INTEGER);
    INSERT INTO users VALUES (1,'Delete me'),(2,'Keep me');
    INSERT INTO transactions VALUES (10,100),(11,200),(12,300);
    INSERT INTO users_transcation_link VALUES (1,10),(1,11),(2,11),(2,12);
    INSERT INTO users_category_link VALUES (1,1),(2,1);
    INSERT INTO categories VALUES (1,'Shared category');
    INSERT INTO budget VALUES (1),(2);
    INSERT INTO savings_goals VALUES (1),(2);
    INSERT INTO reset_tokens VALUES (1),(2);
    INSERT INTO user_preferences VALUES (1),(2);
  `);
  await deleteUserData(db, 1);
  assert.deepEqual(await db.all("SELECT userid FROM users ORDER BY userid"), [{ userid: 2 }]);
  assert.deepEqual(await db.all("SELECT transid FROM transactions ORDER BY transid"), [{ transid: 11 }, { transid: 12 }]);
  assert.deepEqual(await db.all("SELECT userid,transid FROM users_transcation_link ORDER BY transid"), [
    { userid: 2, transid: 11 }, { userid: 2, transid: 12 },
  ]);
  assert.deepEqual(await db.all("SELECT categoryid FROM categories"), [{ categoryid: 1 }]);
  assert.deepEqual(await db.all("SELECT userid FROM budget"), [{ userid: 2 }]);
  console.log("Account deletion, import type inference, opening-balance editing, and Ollama selection verified.");
} finally {
  if (db) await db.close();
  await fs.rm(directory, { recursive: true, force: true });
}

const categoryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "moneypot-category-repair-"));
let categoryDb;
try {
  categoryDb = await openDatabase(path.join(categoryDirectory, "collection.db"));
  await categoryDb.exec(`
    CREATE TABLE transactions (
      transid INTEGER PRIMARY KEY, type TEXT, category TEXT, description TEXT,
      date TEXT, amount REAL, bank_name TEXT
    );
    CREATE TABLE users_transcation_link (userid INTEGER, transid INTEGER);
    CREATE UNIQUE INDEX idx_trans_link_unique ON users_transcation_link(userid,transid);
    CREATE TABLE categories (categoryid INTEGER PRIMARY KEY, type TEXT, imgpath TEXT, name TEXT, fill TEXT);
    CREATE TABLE users_category_link (userid INTEGER, categorykid INTEGER);
    CREATE UNIQUE INDEX idx_category_link_unique ON users_category_link(userid,categorykid);
    INSERT INTO transactions VALUES
      (1,'Credit','Miscellaneous','legacy credit','2026-01-01',10,''),
      (2,'Debit','','blank category','2026-01-02',20,''),
      (3,'Investment','','shared blank','2026-01-03',30,'');
    INSERT INTO users_transcation_link VALUES(1,1),(1,2),(1,3),(2,3);
  `);
  assert.ok(await repairTransactionCategoryLinks(categoryDb) >= 4);
  const invalid = await categoryDb.get(`
    SELECT COUNT(*) AS count
    FROM transactions t JOIN users_transcation_link l ON l.transid=t.transid
    WHERE trim(t.category)=''
      OR NOT EXISTS (
        SELECT 1 FROM categories c JOIN users_category_link u ON u.categorykid=c.categoryid
        WHERE u.userid=l.userid AND c.type=t.type AND lower(c.name)=lower(t.category)
      )
  `);
  assert.equal(invalid.count, 0);
  assert.equal((await categoryDb.get("SELECT COUNT(*) AS count FROM transactions")).count, 4);
} finally {
  if (categoryDb) await categoryDb.close();
  await fs.rm(categoryDirectory, { recursive: true, force: true });
}
