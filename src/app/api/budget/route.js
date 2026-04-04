import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const token = h.split(" ")[1];
  return token ? await verifyJwtToken(token) : null;
}

const UNAUTH = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// GET /api/budget?month=YYYY-MM  — fetch budgets + actual spend for that month
export async function GET(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  // Validate YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format" }, { status: 400 });
  }

  const db = await getDb();
  const startDate = `${month}-01`;
  const endDate   = `${month}-31`;

  // Get all budgets for this user + month
  const budgets = await db.all(
    "SELECT category, amount FROM budget WHERE userid=? AND month=?",
    [payload.id, month]
  );

  // Get actual spending per category for that month
  const actuals = await db.all(`
    SELECT t.category, SUM(t.amount) AS spent
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid=? AND t.type='Debit' AND t.date BETWEEN ? AND ?
    GROUP BY t.category
  `, [payload.id, startDate, endDate]);

  const actualMap = {};
  actuals.forEach(r => { actualMap[r.category] = r.spent; });

  const result = budgets.map(b => ({
    category: b.category,
    budget:   b.amount,
    spent:    actualMap[b.category] || 0,
    remaining: b.amount - (actualMap[b.category] || 0),
    pct: b.amount > 0 ? Math.round(((actualMap[b.category] || 0) / b.amount) * 100) : 0,
  }));

  return NextResponse.json(result);
}

// POST /api/budget — upsert a budget { category, month, amount }
export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const { category, month, amount } = await req.json();
  if (!category || !month || amount === undefined) {
    return NextResponse.json({ error: "category, month, amount required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const db = await getDb();
  await db.run(
    `INSERT INTO budget (userid, category, month, amount)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(userid, category, month) DO UPDATE SET amount=excluded.amount`,
    [payload.id, category, month, amt]
  );

  return NextResponse.json({ success: true });
}

// DELETE /api/budget — delete { category, month }
export async function DELETE(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const { category, month } = await req.json();
  const db = await getDb();
  await db.run(
    "DELETE FROM budget WHERE userid=? AND category=? AND month=?",
    [payload.id, category, month]
  );

  return NextResponse.json({ success: true });
}
