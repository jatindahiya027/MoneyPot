import assert from "node:assert/strict";
import Database from "better-sqlite3";
import path from "node:path";

const filename = process.argv[2];
const userid = Number(process.argv[3] || 1);
const cutoff = process.argv[4] || "2026-01-01";
if (!filename) throw new Error("Usage: node scripts/verify-rollup.mjs <database> [userid] [cutoff]");

const db = new Database(path.resolve(filename), { readonly: true, fileMustExist: true });
const markerKey = `user-${userid}-pre-${cutoff}-compaction-v1`;

try {
  assert.equal(db.pragma("quick_check", { simple: true }), "ok", "database integrity must pass");
  const preRows = db.prepare(`SELECT COUNT(*) rows FROM transactions t JOIN users_transcation_link l USING(transid) WHERE l.userid=? AND t.date<?`).get(userid, cutoff).rows;
  assert.equal(preRows, 0, `all user ${userid} transactions before ${cutoff} must be removed`);

  const marker = db.prepare("SELECT details FROM one_time_data_fixes WHERE key=?").get(markerKey);
  assert.ok(marker, `compaction marker ${markerKey} must exist`);
  const details = JSON.parse(marker.details);
  const summaries = db.prepare(`
    SELECT type, ROUND(amount,2) amount
    FROM transactions t JOIN users_transcation_link l USING(transid)
    WHERE l.userid=? AND t.date=? AND t.category='Opening balance'
      AND t.description LIKE 'Consolidated transactions before %'
    ORDER BY type
  `).all(userid, cutoff);
  assert.equal(summaries.length, 3, "exactly one consolidated Credit, Debit, and Investment row must exist");
  assert.deepEqual(
    Object.fromEntries(summaries.map(row => [row.type.toLowerCase(), row.amount])),
    details.totals,
    "consolidated rows must match the backed-up pre-cutoff totals",
  );

  const totals = db.prepare(`
    SELECT
      ROUND(SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END),2) credit,
      ROUND(SUM(CASE WHEN t.type='Debit' THEN t.amount ELSE 0 END),2) debit,
      ROUND(SUM(CASE WHEN t.type='Investment' THEN t.amount ELSE 0 END),2) investment
    FROM transactions t JOIN users_transcation_link l USING(transid)
    WHERE l.userid=? AND lower(COALESCE(t.category,'')) NOT LIKE '%self%'
  `).get(userid);
  const bankBalance = Math.round((totals.credit - totals.debit - totals.investment + Number.EPSILON) * 100) / 100;
  const savings = Math.round((totals.credit - totals.debit + Number.EPSILON) * 100) / 100;
  const orphanTransactions = db.prepare("SELECT COUNT(*) rows FROM transactions t LEFT JOIN users_transcation_link l USING(transid) WHERE l.transid IS NULL").get().rows;
  const orphanLinks = db.prepare("SELECT COUNT(*) rows FROM users_transcation_link l LEFT JOIN transactions t USING(transid) WHERE t.transid IS NULL").get().rows;
  assert.equal(orphanTransactions, 0, "compaction must not leave orphan transactions");
  assert.equal(orphanLinks, 0, "compaction must not leave orphan links");
  console.log(JSON.stringify({ verified: true, filename: path.resolve(filename), userid, cutoff, totals, bankBalance, savings, summaryRows: summaries.length }, null, 2));
} finally {
  db.close();
}
