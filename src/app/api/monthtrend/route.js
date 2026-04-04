import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const token = h.split(" ")[1];
  return token ? await verifyJwtToken(token) : null;
}

// GET /api/monthtrend?months=6  — returns per-month income/expense for last N months
export async function GET(req) {
  const payload = await auth(req);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { searchParams } = new URL(req.url);
  const monthsBack = Math.min(parseInt(searchParams.get("months") || "6"), 24);

  // Build list of YYYY-MM strings going back N months
  const months = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const db = await getDb();

  // Aggregate by month + type using SQLite's substr for date grouping
  const rows = await db.all(`
    SELECT
      substr(t.date, 1, 7) AS month,
      t.type,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
      AND substr(t.date, 1, 7) >= ?
      AND substr(t.date, 1, 7) <= ?
    GROUP BY substr(t.date, 1, 7), t.type
    ORDER BY month ASC
  `, [payload.id, months[0], months[months.length - 1]]);

  // Build lookup: { "2024-01": { Credit: 0, Debit: 0 } }
  const lookup = {};
  months.forEach(m => { lookup[m] = { Credit: 0, Debit: 0 }; });
  rows.forEach(r => {
    if (lookup[r.month]) lookup[r.month][r.type] = r.total;
  });

  // Also get per-month category breakdown (top 5 debit categories per month)
  const catRows = await db.all(`
    SELECT
      substr(t.date, 1, 7) AS month,
      t.category,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
      AND t.type = 'Debit'
      AND substr(t.date, 1, 7) >= ?
    GROUP BY substr(t.date, 1, 7), t.category
    ORDER BY month ASC, total DESC
  `, [payload.id, months[0]]);

  // Shape final response
  const result = months.map(m => ({
    month: m,
    label: new Date(m + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
    income:   Math.round(lookup[m].Credit),
    expenses: Math.round(lookup[m].Debit),
    net:      Math.round(lookup[m].Credit - lookup[m].Debit),
  }));

  // Category breakdown grouped by month
  const catByMonth = {};
  catRows.forEach(r => {
    if (!catByMonth[r.month]) catByMonth[r.month] = [];
    if (catByMonth[r.month].length < 5) {
      catByMonth[r.month].push({ category: r.category, total: Math.round(r.total) });
    }
  });

  return new Response(JSON.stringify({ trend: result, catByMonth }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
