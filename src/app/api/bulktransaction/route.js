import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

function toISODate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy4 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy4) { const [,d,m,y] = dmy4; return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return null;
}

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
  let inserted = 0;

  // Run inside a SQLite transaction for atomicity and performance
  await db.run("BEGIN");
  try {
    for (const row of rows) {
      const amount = parseFloat(row.amount);
      const date   = toISODate(row.date);
      if (!date || isNaN(amount) || amount < 0) continue;
      if (!["Debit","Credit"].includes(row.type)) continue;

      const bank = String(row.bank_name || "").trim().slice(0, 80);
      const result = await db.run(
        "INSERT INTO transactions (type, category, description, date, amount, bank_name) VALUES (?,?,?,?,?,?)",
        [row.type, row.category || "", row.description || "", date, amount, bank]
      );
      await db.run(
        "INSERT INTO users_transcation_link (userid, transid) VALUES (?,?)",
        [payload.id, result.lastID]
      );
      inserted++;
    }
    await db.run("COMMIT");
  } catch (err) {
    await db.run("ROLLBACK");
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted });
}
