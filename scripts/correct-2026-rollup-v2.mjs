import Database from "better-sqlite3";
import path from "node:path";

const filename = process.argv[2];
const userid = Number(process.argv[3] || 1);
const cutoff = process.argv[4] || "2026-01-01";

if (!filename) throw new Error("Usage: node scripts/correct-2026-rollup-v2.mjs <database> [userid] [cutoff]");
if (!Number.isInteger(userid) || userid <= 0) throw new Error(`Invalid userid: ${process.argv[3]}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) throw new Error(`Invalid cutoff date: ${cutoff}`);

const absoluteFilename = path.resolve(filename);
const connection = new Database(absoluteFilename, { fileMustExist: true });
connection.pragma("busy_timeout = 10000");
connection.pragma("foreign_keys = ON");
connection.exec(`CREATE TABLE IF NOT EXISTS one_time_data_fixes (
  key TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL,
  details TEXT
)`);

const markerKey = `user-${userid}-pre-${cutoff}-compaction-v1`;
const existingMarker = connection.prepare("SELECT details FROM one_time_data_fixes WHERE key=?").get(markerKey);
const preCount = connection.prepare(`
  SELECT COUNT(*) rows
  FROM transactions t
  JOIN users_transcation_link l ON l.transid=t.transid
  WHERE l.userid=? AND t.date<?
`).get(userid, cutoff).rows;

if (preCount === 0) {
  if (!existingMarker) throw new Error(`No transactions exist before ${cutoff}, but compaction marker ${markerKey} is missing.`);
  console.log(JSON.stringify({ compacted: false, alreadyApplied: true, filename: absoluteFilename, userid, cutoff, details: JSON.parse(existingMarker.details) }, null, 2));
  connection.close();
  process.exit(0);
}

const totalsRow = connection.prepare(`
  SELECT
    COALESCE(SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END),0) credit,
    COALESCE(SUM(CASE WHEN t.type='Debit' THEN t.amount ELSE 0 END),0) debit,
    COALESCE(SUM(CASE WHEN t.type='Investment' THEN t.amount ELSE 0 END),0) investment,
    COUNT(*) includedRows
  FROM transactions t
  JOIN users_transcation_link l ON l.transid=t.transid
  WHERE l.userid=? AND t.date<? AND lower(COALESCE(t.category,'')) NOT LIKE '%self%'
`).get(userid, cutoff);

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const totals = {
  credit: roundMoney(totalsRow.credit),
  debit: roundMoney(totalsRow.debit),
  investment: roundMoney(totalsRow.investment),
};

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const parsed = path.parse(absoluteFilename);
const backup = path.join(parsed.dir, `${parsed.name}.before-pre-2026-compaction-${stamp}.backup${parsed.ext || ".db"}`);
await connection.backup(backup);

const compact = connection.transaction(() => {
  const oldSummaries = connection.prepare(`
    SELECT t.transid
    FROM transactions t
    JOIN users_transcation_link l ON l.transid=t.transid
    WHERE l.userid=? AND t.date=? AND t.category='Opening balance'
      AND (t.description LIKE 'Verified pre-2026 % total' OR t.description LIKE 'Consolidated transactions before %')
  `).all(userid, cutoff);
  const deleteLink = connection.prepare("DELETE FROM users_transcation_link WHERE userid=? AND transid=?");
  for (const row of oldSummaries) deleteLink.run(userid, row.transid);

  const removedLinks = connection.prepare(`
    DELETE FROM users_transcation_link
    WHERE userid=? AND transid IN (SELECT transid FROM transactions WHERE date<?)
  `).run(userid, cutoff).changes;
  connection.prepare("DELETE FROM transactions WHERE NOT EXISTS (SELECT 1 FROM users_transcation_link l WHERE l.transid=transactions.transid)").run();

  const insertTransaction = connection.prepare(`
    INSERT INTO transactions(type,category,description,date,amount,bank_name)
    VALUES(?,?,?,?,?,?)
  `);
  const insertLink = connection.prepare("INSERT INTO users_transcation_link(userid,transid) VALUES(?,?)");
  for (const type of ["Credit", "Debit", "Investment"]) {
    const amount = totals[type.toLowerCase()];
    const result = insertTransaction.run(
      type,
      "Opening balance",
      `Consolidated transactions before ${cutoff}: ${type.toLowerCase()}`,
      cutoff,
      amount,
      "Opening balance",
    );
    insertLink.run(userid, result.lastInsertRowid);
  }

  const details = {
    cutoff,
    userid,
    removedRows: removedLinks,
    includedRows: Number(totalsRow.includedRows),
    totals,
    bankBalance: roundMoney(totals.credit - totals.debit - totals.investment),
    savings: roundMoney(totals.credit - totals.debit),
  };
  connection.prepare("DELETE FROM one_time_data_fixes WHERE key IN ('primary-user-pre-2026-rollup-v1','primary-user-pre-2026-rollup-v2',?)").run(markerKey);
  connection.prepare("INSERT INTO one_time_data_fixes(key,applied_at,details) VALUES(?,datetime('now'),?)").run(markerKey, JSON.stringify(details));
  return details;
});

try {
  const details = compact();
  const integrity = connection.pragma("quick_check", { simple: true });
  if (integrity !== "ok") throw new Error(`SQLite integrity check failed after compaction: ${integrity}`);
  console.log(JSON.stringify({ compacted: true, filename: absoluteFilename, backup, ...details }, null, 2));
} finally {
  connection.close();
}
