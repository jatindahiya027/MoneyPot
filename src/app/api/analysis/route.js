import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const t = h.split(" ")[1];
  return t ? await verifyJwtToken(t) : null;
}

// ── 50/30/20 category classification defaults ────────────────────────────────
// Users can override via the category_rules table (future).
// Anything not listed defaults to "Wants".
const NEEDS_CATEGORIES  = ["rent","food","utilities","health care","healthcare","transportation","personal care","personalcare"];
const SAVINGS_CATEGORIES = ["savings","investment","fd","emergency","ppf","mutual fund"];

function classifyCategory(name) {
  const n = (name || "").toLowerCase();
  if (SAVINGS_CATEGORIES.some(s => n.includes(s))) return "savings";
  if (NEEDS_CATEGORIES.some(s => n.includes(s)))   return "needs";
  return "wants";
}

// ── Health score computation (0-100) ────────────────────────────────────────
// 5 components, each 0-20 points:
//  1. Savings rate        — (income - expenses) / income
//  2. Budget adherence    — % of budgeted categories under limit this month
//  3. Spending trend      — are expenses decreasing vs 3 months ago?
//  4. Income stability    — std-dev of monthly income (lower = better)
//  5. Expense consistency — std-dev of monthly expenses (lower = better)

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function computeHealthScore({ savingsRate, budgetAdherence, trendScore, incomeStdDev, avgIncome, expenseStdDev, avgExpense }) {
  // 1. Savings rate: 20% target = full points
  const s1 = clamp((savingsRate / 0.20) * 20, 0, 20);

  // 2. Budget adherence: 0-20 from % of categories on track
  const s2 = clamp(budgetAdherence * 20, 0, 20);

  // 3. Trend: expenses going down = good
  const s3 = clamp(trendScore * 20, 0, 20);

  // 4. Income stability: CV (std/mean) < 0.1 = full points
  const incomeCV = avgIncome > 0 ? incomeStdDev / avgIncome : 1;
  const s4 = clamp((1 - incomeCV / 0.5) * 20, 0, 20);

  // 5. Expense consistency
  const expCV = avgExpense > 0 ? expenseStdDev / avgExpense : 1;
  const s5 = clamp((1 - expCV / 0.5) * 20, 0, 20);

  return {
    total: Math.round(s1 + s2 + s3 + s4 + s5),
    components: {
      savingsRate:    { score: Math.round(s1), label: "Savings rate",     value: `${Math.round(savingsRate * 100)}%` },
      budgetAdh:      { score: Math.round(s2), label: "Budget adherence", value: `${Math.round(budgetAdherence * 100)}%` },
      spendTrend:     { score: Math.round(s3), label: "Spending trend",   value: trendScore >= 0.5 ? "Improving" : "Worsening" },
      incomeStability:{ score: Math.round(s4), label: "Income stability", value: incomeCV < 0.1 ? "Stable" : "Variable" },
      expConsistency: { score: Math.round(s5), label: "Consistency",      value: expCV < 0.15 ? "Consistent" : "Irregular" },
    },
  };
}

export async function GET(req) {
  const payload = await auth(req);
  if (!payload) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  const db = await getDb();
  const uid = payload.id;

  // ── 1. Monthly totals for last 6 months ─────────────────────────────────
  const monthRows = await db.all(`
    SELECT substr(t.date,1,7) AS month,
           SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END) AS income,
           SUM(CASE WHEN t.type='Debit'  THEN t.amount ELSE 0 END) AS expenses
    FROM transactions t
    JOIN users_transcation_link l ON t.transid=l.transid
    WHERE l.userid=?
      AND t.date >= date('now','-6 months')
    GROUP BY month ORDER BY month ASC
  `, [uid]);

  // ── 2. Current month category spend ─────────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7);
  const catSpend = await db.all(`
    SELECT t.category, SUM(t.amount) AS spent
    FROM transactions t
    JOIN users_transcation_link l ON t.transid=l.transid
    WHERE l.userid=? AND t.type='Debit'
      AND substr(t.date,1,7)=?
    GROUP BY t.category
  `, [uid, currentMonth]);

  // ── 3. Budget data this month ────────────────────────────────────────────
  const budgets = await db.all(
    "SELECT category, amount FROM budget WHERE userid=? AND month=?",
    [uid, currentMonth]
  );

  // ── 4. Anomaly detection — compare this month vs 3-month trailing avg ───
  const trailingAvg = await db.all(`
    SELECT t.category,
           AVG(monthly_total) AS avg_spend
    FROM (
      SELECT t.category, substr(t.date,1,7) AS month,
             SUM(t.amount) AS monthly_total
      FROM transactions t
      JOIN users_transcation_link l ON t.transid=l.transid
      WHERE l.userid=? AND t.type='Debit'
        AND substr(t.date,1,7) < ?
        AND substr(t.date,1,7) >= date(?||'-01','-3 months','start of month')
      GROUP BY t.category, month
    ) t
    GROUP BY t.category
  `, [uid, currentMonth, currentMonth]);

  const avgMap = {};
  trailingAvg.forEach(r => { avgMap[r.category] = r.avg_spend; });

  const anomalies = catSpend
    .filter(r => avgMap[r.category] && avgMap[r.category] > 0)
    .map(r => ({
      category: r.category,
      spent: Math.round(r.spent),
      avg: Math.round(avgMap[r.category]),
      multiplier: parseFloat((r.spent / avgMap[r.category]).toFixed(2)),
      severity: r.spent / avgMap[r.category] >= 2 ? "high" : r.spent / avgMap[r.category] >= 1.5 ? "medium" : "normal",
    }))
    .filter(r => r.severity !== "normal")
    .sort((a, b) => b.multiplier - a.multiplier);

  // ── 5. 50/30/20 analysis ─────────────────────────────────────────────────
  const totalIncome   = catSpend.reduce((s) => s, 0); // use monthly income
  const thisMonthIncome = monthRows.find(r => r.month === currentMonth)?.income || 0;

  const buckets = { needs: 0, wants: 0, savings: 0 };
  catSpend.forEach(r => {
    const bucket = classifyCategory(r.category);
    buckets[bucket] += r.spent;
  });
  // savings bucket = income - all spending (true savings)
  const totalSpent = catSpend.reduce((s, r) => s + r.spent, 0);
  const trueSavings = Math.max(0, thisMonthIncome - totalSpent);
  const analysis503020 = {
    income: Math.round(thisMonthIncome),
    needs:   { amount: Math.round(buckets.needs),   pct: thisMonthIncome > 0 ? Math.round((buckets.needs   / thisMonthIncome) * 100) : 0, target: 50 },
    wants:   { amount: Math.round(buckets.wants),   pct: thisMonthIncome > 0 ? Math.round((buckets.wants   / thisMonthIncome) * 100) : 0, target: 30 },
    savings: { amount: Math.round(trueSavings),     pct: thisMonthIncome > 0 ? Math.round((trueSavings     / thisMonthIncome) * 100) : 0, target: 20 },
  };

  // ── 6. Health score inputs ────────────────────────────────────────────────
  const avgIncome  = monthRows.length ? monthRows.reduce((s, r) => s + r.income, 0)   / monthRows.length : 0;
  const avgExpense = monthRows.length ? monthRows.reduce((s, r) => s + r.expenses, 0) / monthRows.length : 0;

  const incomeStdDev  = monthRows.length > 1
    ? Math.sqrt(monthRows.reduce((s, r) => s + Math.pow(r.income   - avgIncome, 2),  0) / monthRows.length) : 0;
  const expenseStdDev = monthRows.length > 1
    ? Math.sqrt(monthRows.reduce((s, r) => s + Math.pow(r.expenses - avgExpense, 2), 0) / monthRows.length) : 0;

  const savingsRate = avgIncome > 0 ? (avgIncome - avgExpense) / avgIncome : 0;

  // Budget adherence: fraction of budgeted categories under limit
  const budgetMap = {};
  budgets.forEach(b => { budgetMap[b.category] = b.amount; });
  const catSpendMap = {};
  catSpend.forEach(r => { catSpendMap[r.category] = r.spent; });
  const budgetedCats = Object.keys(budgetMap);
  const budgetAdherence = budgetedCats.length > 0
    ? budgetedCats.filter(c => (catSpendMap[c] || 0) <= budgetMap[c]).length / budgetedCats.length
    : 0.5; // neutral if no budgets set

  // Trend: compare last month expenses vs 3 months ago
  const sorted = [...monthRows].sort((a, b) => a.month.localeCompare(b.month));
  let trendScore = 0.5;
  if (sorted.length >= 2) {
    const recent = sorted[sorted.length - 1].expenses;
    const older  = sorted[0].expenses;
    trendScore = older > 0 ? clamp(1 - (recent / older - 0.7) / 0.6, 0, 1) : 0.5;
  }

  const healthScore = computeHealthScore({ savingsRate, budgetAdherence, trendScore, incomeStdDev, avgIncome, expenseStdDev, avgExpense });

  // ── 7. Savings goals ─────────────────────────────────────────────────────
  const goals = await db.all(
    "SELECT * FROM savings_goals WHERE userid=? ORDER BY created_at DESC",
    [uid]
  ).catch(() => []); // table may not exist yet — fail gracefully

  return new Response(JSON.stringify({
    healthScore,
    anomalies,
    analysis503020,
    goals,
    monthRows,
  }), { headers: { "Content-Type": "application/json" }, status: 200 });
}
