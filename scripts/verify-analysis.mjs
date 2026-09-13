import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(new URL("../src/lib/financialAnalysis.js", import.meta.url), "utf8");
const { analyzeFinances } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const now = new Date("2026-06-15T12:00:00Z");
const oneMonth = analyzeFinances([{ type:"Credit", amount:100000, date:"2026-06-01", category:"Salary" }, { type:"Debit", amount:50000, date:"2026-06-02", category:"Food" }], 1, now);
assert.equal(oneMonth.timeframe, 1);
assert.equal(oneMonth.signals.find(s => s.key === "income_stability").score, null);
assert.equal(oneMonth.signals.find(s => s.key === "spending_direction").score, null);
assert.equal(oneMonth.availableSignalCount, 3, "missing history must not count as a zero");
const threeMonths = analyzeFinances([
  { type:"Credit", amount:100000, date:"2026-04-01", category:"Salary" }, { type:"Debit", amount:70000, date:"2026-04-02", category:"Rent" },
  { type:"Credit", amount:100000, date:"2026-05-01", category:"Salary" }, { type:"Debit", amount:60000, date:"2026-05-02", category:"Rent" },
  { type:"Credit", amount:100000, date:"2026-06-01", category:"Salary" }, { type:"Debit", amount:50000, date:"2026-06-02", category:"Rent" },
  { type:"Credit", amount:200000, date:"2026-01-01", category:"Opening balance" },
], 3, now);
assert.equal(threeMonths.signals.find(s => s.key === "income_stability").score, 20);
assert.equal(threeMonths.signals.find(s => s.key === "spending_direction").state, "strong");
assert.equal(threeMonths.summary.income, 300000, "opening balance must not distort behavioral signals");
assert.equal(threeMonths.summary.balance, 320000, "opening balance must still contribute to available cash");
assert.equal(threeMonths.signals.find(s => s.key === "expense_load").score, 20, "70% expense load should retain a full score");
const highLoad = analyzeFinances([{ type:"Credit", amount:100000, date:"2026-06-01", category:"Salary" }, { type:"Debit", amount:80000, date:"2026-06-02", category:"Rent" }], 1, now);
assert.equal(highLoad.signals.find(s => s.key === "expense_load").score, 13, "80% expense load should not receive a perfect score");
const allTime = analyzeFinances([
  { type:"Credit", amount:100000, date:"2025-12-01", category:"Salary" },
  { type:"Debit", amount:50000, date:"2026-06-01", category:"Food" },
], "all", now);
assert.equal(allTime.timeframe, 7, "all-time analysis must derive its range from data instead of a hard-coded year");
console.log("Analysis signals verified.");
