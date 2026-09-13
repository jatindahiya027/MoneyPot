import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/lib/finance.js", import.meta.url), "utf8");
const finance = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

const rows = [
  { type: "Credit", amount: 1000, date: "2026-01-02", category: "Salary", bank_name: "Bank A" },
  { type: "Debit", amount: 300, date: "2026-01-03", category: "Food", bank_name: "Bank A" },
  { type: "Investment", amount: 200, date: "2026-01-04", category: "Investments", bank_name: "Bank A" },
  { type: "Investment", amount: -50, date: "2026-01-05", category: "Investment redemption", bank_name: "Bank A" },
  { type: "Debit", amount: 100, date: "2026-01-05", category: "Self", bank_name: "Bank A" },
  { type: "Credit", amount: 9999, date: "2025-12-31", category: "Salary", bank_name: "Bank A" },
  { type: "Debit", amount: 4000, date: "2025-12-31", category: "Opening balance", bank_name: "Opening balance" },
];
const allTime = finance.summarizeTransactions(rows, { Food: "#fff" });
const allTimeTotals = Object.fromEntries(allTime.creditdebit.map(row => [row.type, row.amount]));
assert.deepEqual(allTimeTotals, { Credit: 10999, Debit: 4300, Investment: 150 }, "default summaries must use database contents without a hidden cutoff");
assert.deepEqual(allTime.catamount.map(row => row.category), ["Food"], "opening balances must affect ledger totals without pretending to be a spending category");
const result = finance.summarizeTransactions(rows, { Food: "#fff" }, "2026-01-01");
const totals = Object.fromEntries(result.creditdebit.map(row => [row.type, row.amount]));
assert.deepEqual(totals, { Credit: 1000, Debit: 300, Investment: 150 });
assert.equal(result.balance, 550, "bank = credit - debit - net investment");
assert.equal(result.savings, 700, "savings = credit - debit");
assert.equal(result.catamount[0].amount, 300, "investment and self transfers are excluded from expense categories");
console.log("Finance invariants verified.");
