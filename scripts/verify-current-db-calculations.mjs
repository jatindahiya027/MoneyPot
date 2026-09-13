import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Database from "better-sqlite3";
import path from "node:path";

const filename = process.argv[2];
const userid = Number(process.argv[3] || 1);
if (!filename) throw new Error("Usage: node scripts/verify-current-db-calculations.mjs <database> [userid]");

const financeSource = await readFile(new URL("../src/lib/finance.js", import.meta.url), "utf8");
const { summarizeTransactions } = await import(`data:text/javascript;base64,${Buffer.from(financeSource).toString("base64")}`);
const analysisSource = await readFile(new URL("../src/lib/financialAnalysis.js", import.meta.url), "utf8");
const { analyzeFinances } = await import(`data:text/javascript;base64,${Buffer.from(analysisSource).toString("base64")}`);

const db = new Database(path.resolve(filename), { readonly: true, fileMustExist: true });
try {
  const transactions = db.prepare(`SELECT t.* FROM transactions t JOIN users_transcation_link l USING(transid) WHERE l.userid=? ORDER BY t.date,t.transid`).all(userid);
  const categories = db.prepare(`SELECT c.name,c.fill FROM categories c JOIN users_category_link l ON l.categorykid=c.categoryid WHERE l.userid=?`).all(userid);
  const direct = db.prepare(`
    SELECT
      ROUND(SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END),2) credit,
      ROUND(SUM(CASE WHEN t.type='Debit' THEN t.amount ELSE 0 END),2) debit,
      ROUND(SUM(CASE WHEN t.type='Investment' THEN t.amount ELSE 0 END),2) investment
    FROM transactions t JOIN users_transcation_link l USING(transid)
    WHERE l.userid=? AND lower(COALESCE(t.category,'')) NOT LIKE '%self%'
  `).get(userid);
  const summary = summarizeTransactions(transactions, Object.fromEntries(categories.map(row => [row.name, row.fill])));
  const summarized = Object.fromEntries(summary.creditdebit.map(row => [row.type.toLowerCase(), Math.round((row.amount + Number.EPSILON) * 100) / 100]));
  assert.deepEqual(summarized, direct, "dashboard totals must equal direct SQL totals");
  assert.equal(Math.round((summary.balance + Number.EPSILON) * 100) / 100, Math.round((direct.credit - direct.debit - direct.investment + Number.EPSILON) * 100) / 100, "bank balance must be credit - debit - net investment");
  assert.equal(Math.round((summary.savings + Number.EPSILON) * 100) / 100, Math.round((direct.credit - direct.debit + Number.EPSILON) * 100) / 100, "savings must be credit - debit");
  assert.ok(summary.catamount.every(row => row.category !== "Opening balance"), "opening balance must not appear as a spending category");

  const bankTotals = summary.banktrend.reduce((totals, row) => ({
    credit: totals.credit + row.credit,
    debit: totals.debit + row.debit,
    investment: totals.investment + row.investment,
  }), { credit: 0, debit: 0, investment: 0 });
  for (const type of ["credit", "debit", "investment"]) {
    assert.equal(Math.round((bankTotals[type] + Number.EPSILON) * 100) / 100, direct[type], `bank breakdown ${type} must reconcile`);
  }

  const analysis = analyzeFinances(transactions, "all", new Date());
  assert.equal(analysis.summary.balance, Math.round((direct.credit - direct.debit - direct.investment + Number.EPSILON) * 100) / 100, "analysis cash balance must reconcile with dashboard and SQL");
  console.log(JSON.stringify({ verified: true, userid, rows: transactions.length, totals: direct, bankBalance: summary.balance, savings: summary.savings, categories: summary.catamount.length }, null, 2));
} finally {
  db.close();
}
