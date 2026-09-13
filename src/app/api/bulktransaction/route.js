import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
import { normalizeTransactionInput } from "@/libs/transactionValidation";

// POST /api/bulktransaction — accepts { rows: [...] } and inserts all in one transaction
export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false }, { status: 401 });
  const token = authHeader.split(" ")[1];
  const payload = await verifyJwtToken(token);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: "No rows provided" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ success: false, error: "Max 500 rows per batch" }, { status: 400 });
  }

  const db = await getDb();
  const categories = await db.all(`
    SELECT c.type, lower(c.name) AS name
    FROM categories c JOIN users_category_link l ON l.categorykid=c.categoryid
    WHERE l.userid=?
  `, [payload.id]);
  const allowedCategories = new Set(categories.map(category => `${category.type}\u0000${category.name}`));
  const normalizedRows = [];
  const errors = [];
  rows.forEach((row, index) => {
    const normalized = normalizeTransactionInput(row);
    if (normalized.error) errors.push({ row: index + 1, error: normalized.error });
    else if (!allowedCategories.has(`${normalized.value.type}\u0000${normalized.value.category.toLowerCase()}`)) {
      errors.push({ row: index + 1, error: "Category is unavailable for this transaction type." });
    } else normalizedRows.push(normalized.value);
  });
  if (errors.length) {
    return NextResponse.json({ success: false, error: "Import validation failed.", errors: errors.slice(0, 20) }, { status: 400 });
  }

  await db.run("BEGIN IMMEDIATE");
  try {
    for (const row of normalizedRows) {
      const result = await db.run(
        "INSERT INTO transactions (type, category, description, date, amount, bank_name) VALUES (?,?,?,?,?,?)",
        [row.type, row.category, row.description, row.date, row.amount, row.bank_name]
      );
      await db.run(
        "INSERT INTO users_transcation_link (userid, transid) VALUES (?,?)",
        [payload.id, result.lastID]
      );
    }
    await db.run("COMMIT");
  } catch (err) {
    await db.run("ROLLBACK");
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted: normalizedRows.length });
}
