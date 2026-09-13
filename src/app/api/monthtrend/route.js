import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import {
  listRecentMonths,
  queryMonthlyDebitCategories,
  queryMonthlyTotals,
} from "@/lib/monthTrendQueries.mjs";

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
  const requestedMonths = Number.parseInt(searchParams.get("months") || "6", 10);
  const monthsBack = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;

  const months = listRecentMonths(monthsBack);

  const db = await getDb();

  // Investment is tracked separately because it is funded from income, not extra income.
  const [rows, catRows] = await Promise.all([
    queryMonthlyTotals(db, payload.id, months[0], months[months.length - 1]),
    queryMonthlyDebitCategories(db, payload.id, months[0], months[months.length - 1]),
  ]);

  // Build lookup: { "2024-01": { Credit: 0, Debit: 0, Investment: 0 } }
  const lookup = {};
  months.forEach(m => { lookup[m] = { Credit: 0, Debit: 0, Investment: 0 }; });
  rows.forEach(r => {
    if (lookup[r.month]) {
      lookup[r.month].Credit = r.income || 0;
      lookup[r.month].Debit = r.expenses || 0;
      lookup[r.month].Investment = r.investment || 0;
    }
  });

  // Shape final response
  const roundMoney = value => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
  const result = months.map(m => {
    const income = roundMoney(lookup[m].Credit);
    const expenses = roundMoney(lookup[m].Debit);
    const investment = roundMoney(lookup[m].Investment);
    const savings = roundMoney(income - expenses);
    return {
      month: m,
      label: new Date(`${m}-01T12:00:00`).toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      income,
      expenses,
      investment,
      savings,
      net: savings,
      cashFlow: roundMoney(savings - investment),
    };
  });

  // Category breakdown grouped by month
  const catByMonth = {};
  catRows.forEach(r => {
    if (!catByMonth[r.month]) catByMonth[r.month] = [];
    if (catByMonth[r.month].length < 5) {
      catByMonth[r.month].push({ category: r.category, total: roundMoney(r.total) });
    }
  });

  return new Response(JSON.stringify({ trend: result, catByMonth }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
