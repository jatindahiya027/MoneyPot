const NEEDS = ["rent", "food", "utilities", "health care", "healthcare", "transportation", "personal care", "credit card"];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = value => Math.round((Number(value) || 0) * 100) / 100;

function monthKeys(months, now = new Date()) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function signal(key, label, score, value, summary, detail, action, available = true) {
  const state = !available ? "unavailable" : score >= 16 ? "strong" : score >= 10 ? "steady" : "needs_attention";
  return { key, label, score: available ? Math.round(score) : null, value, state, summary, detail, action };
}

export function analyzeFinances(transactions, months = 3, now = new Date()) {
  const allTime = months === "all";
  const nonSelf = transactions.filter(row => !String(row.category || "").toLowerCase().includes("self"));
  const behavioralRows = nonSelf.filter(row => row.category !== "Opening balance");
  const datedBehavior = behavioralRows
    .map(row => String(row.date || "").slice(0, 7))
    .filter(month => /^\d{4}-\d{2}$/.test(month) && month <= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .sort();
  const earliest = datedBehavior[0];
  const allTimeMonths = earliest
    ? (now.getFullYear() - Number(earliest.slice(0, 4))) * 12 + now.getMonth() - Number(earliest.slice(5, 7)) + 2
    : 1;
  const monthCount = allTime ? Math.max(1, allTimeMonths) : clamp(Number(months) || 3, 1, 6);
  const keys = monthKeys(monthCount, now);
  const windowRows = behavioralRows.filter(row => keys.includes(String(row.date || "").slice(0, 7)));
  const allOperational = nonSelf;
  const monthly = keys.map(month => {
    const rows = windowRows.filter(row => String(row.date).startsWith(month));
    return {
      month,
      income: rows.filter(row => row.type === "Credit").reduce((sum, row) => sum + Number(row.amount || 0), 0),
      expenses: rows.filter(row => row.type === "Debit").reduce((sum, row) => sum + Number(row.amount || 0), 0),
      investment: rows.filter(row => row.type === "Investment").reduce((sum, row) => sum + Number(row.amount || 0), 0),
    };
  });
  const income = monthly.reduce((sum, row) => sum + row.income, 0);
  const expenses = monthly.reduce((sum, row) => sum + row.expenses, 0);
  const investment = monthly.reduce((sum, row) => sum + row.investment, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? savings / income : null;
  const expenseRatio = income > 0 ? expenses / income : null;
  const averageExpense = expenses / keys.length;
  const balance = allOperational.reduce((sum, row) => sum + (row.type === "Credit" ? Number(row.amount) : row.type === "Debit" || row.type === "Investment" ? -Number(row.amount) : 0), 0);
  const bufferMonths = averageExpense > 0 ? Math.max(balance, 0) / averageExpense : null;
  const activeIncomeMonths = monthly.filter(row => row.income > 0);
  const averageIncome = activeIncomeMonths.length ? activeIncomeMonths.reduce((sum, row) => sum + row.income, 0) / activeIncomeMonths.length : 0;
  const incomeCv = activeIncomeMonths.length >= 2 && averageIncome > 0
    ? Math.sqrt(activeIncomeMonths.reduce((sum, row) => sum + Math.pow(row.income - averageIncome, 2), 0) / activeIncomeMonths.length) / averageIncome
    : null;
  const comparableExpenseMonths = monthly.filter(row => row.expenses > 0);
  const spendingChange = comparableExpenseMonths.length >= 2
    ? (comparableExpenseMonths.at(-1).expenses - comparableExpenseMonths.slice(0, -1).reduce((sum, row) => sum + row.expenses, 0) / (comparableExpenseMonths.length - 1)) /
      (comparableExpenseMonths.slice(0, -1).reduce((sum, row) => sum + row.expenses, 0) / (comparableExpenseMonths.length - 1))
    : null;

  const signals = [
    savingsRate === null
      ? signal("savings", "Savings rate", 0, "Not available", "Income is missing", "A savings rate needs at least one Credit transaction in this period.", "Record income to unlock this signal.", false)
      : signal("savings", "Savings rate", clamp(savingsRate / 0.2 * 20, 0, 20), `${Math.round(savingsRate * 100)}%`, savingsRate >= 0.2 ? "You are meeting the 20% savings guideline" : savingsRate >= 0 ? "You are saving, but below the 20% guideline" : "Expenses are higher than income", `${round(savings)} saved from ${round(income)} income. Investments are part of savings, not expenses.`, savingsRate >= 0.2 ? "Keep the current margin." : "Review flexible spending and protect a regular savings amount."),
    expenseRatio === null
      ? signal("expense_load", "Expense load", 0, "Not available", "Income is missing", "Expense load compares Debit spending with Credit income.", "Record income to unlock this signal.", false)
      : signal("expense_load", "Expense load", expenseRatio <= 0.7 ? 20 : clamp((1 - expenseRatio) / 0.3 * 20, 0, 20), `${Math.round(expenseRatio * 100)}%`, expenseRatio <= 0.7 ? "Spending leaves healthy room" : expenseRatio <= 0.85 ? "Spending leaves a modest margin" : expenseRatio <= 1 ? "Spending leaves limited room" : "Spending is above income", `${round(expenses)} spent from ${round(income)} income. Expense load is total Debit spending divided by Credit income; investments are excluded.`, expenseRatio <= 0.7 ? "No action needed." : "Review the largest flexible categories and protect a savings margin."),
    bufferMonths === null
      ? signal("buffer", "Cash buffer", 0, "Not available", "No expenses to compare", "Buffer coverage needs a monthly expense baseline.", "Record regular expenses to unlock this signal.", false)
      : signal("buffer", "Cash buffer", clamp(bufferMonths / 3 * 20, 0, 20), `${bufferMonths.toFixed(1)} months`, bufferMonths >= 3 ? "Your available balance covers at least three months" : bufferMonths >= 1 ? "You have a starter buffer" : "Your buffer is thin", `${round(Math.max(balance, 0))} available against ${round(averageExpense)} average monthly expenses.`, bufferMonths >= 3 ? "Maintain the reserve." : "Build toward one month first, then three."),
    incomeCv === null
      ? signal("income_stability", "Income stability", 0, "Not enough data", "Two income months are required", `Only ${activeIncomeMonths.length} month${activeIncomeMonths.length === 1 ? "" : "s"} contain income in this range.`, "Choose a longer timeframe or record income consistently.", false)
      : signal("income_stability", "Income stability", clamp((1 - incomeCv / 0.5) * 20, 0, 20), `${Math.round(incomeCv * 100)}% variation`, incomeCv <= 0.1 ? "Income is very consistent" : incomeCv <= 0.3 ? "Income varies moderately" : "Income changes significantly month to month", `Average monthly income is ${round(averageIncome)} across ${activeIncomeMonths.length} active months.`, incomeCv <= 0.3 ? "Plan using the lower-income month." : "Keep a larger cash buffer for variable months."),
    spendingChange === null
      ? signal("spending_direction", "Spending direction", 0, "Not enough data", "Two expense months are required", `Only ${comparableExpenseMonths.length} month${comparableExpenseMonths.length === 1 ? "" : "s"} contain expenses.`, "Choose a longer timeframe to see a direction.", false)
      : signal("spending_direction", "Spending direction", clamp(12 - spendingChange * 40, 0, 20), `${spendingChange >= 0 ? "+" : ""}${Math.round(spendingChange * 100)}%`, spendingChange <= -0.05 ? "Recent spending is lower" : spendingChange <= 0.05 ? "Spending is broadly steady" : "Recent spending is higher", `The latest month is compared with the average of earlier months in this range.`, spendingChange <= 0.05 ? "Keep watching the largest categories." : "Check whether the increase is planned or recurring."),
  ];
  const availableSignals = signals.filter(item => item.score !== null);
  const score = availableSignals.length ? Math.round(availableSignals.reduce((sum, item) => sum + item.score, 0) / availableSignals.length * 5) : null;

  const categoryTotals = new Map();
  for (const row of windowRows.filter(row => row.type === "Debit")) categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + Number(row.amount || 0));
  let needs = 0;
  for (const [category, amount] of categoryTotals) if (NEEDS.some(name => String(category).toLowerCase().includes(name))) needs += amount;
  const wants = expenses - needs;

  const anomalyBaseline = monthly.slice(0, -1);
  const currentMonth = monthly.at(-1)?.month;
  const currentCategories = new Map();
  windowRows.filter(row => row.type === "Debit" && String(row.date).startsWith(currentMonth)).forEach(row => currentCategories.set(row.category, (currentCategories.get(row.category) || 0) + Number(row.amount || 0)));
  const anomalies = [];
  if (anomalyBaseline.length >= 2) {
    for (const [category, current] of currentCategories) {
      const prior = anomalyBaseline.map(month => windowRows.filter(row => row.type === "Debit" && row.category === category && String(row.date).startsWith(month.month)).reduce((sum, row) => sum + Number(row.amount || 0), 0)).filter(Boolean);
      if (prior.length >= 2) {
        const baseline = prior.sort((a, b) => a - b)[Math.floor(prior.length / 2)];
        if (baseline > 0 && current >= baseline * 1.5 && current - baseline >= 500) anomalies.push({ category, current: round(current), baseline: round(baseline), multiple: round(current / baseline) });
      }
    }
  }

  return {
    timeframe: keys.length,
    score,
    scoreLabel: score === null ? "Waiting for data" : score >= 80 ? "Strong" : score >= 60 ? "Stable" : score >= 40 ? "Needs attention" : "Early warning",
    availableSignalCount: availableSignals.length,
    signals,
    summary: { income: round(income), expenses: round(expenses), investment: round(investment), savings: round(savings), balance: round(balance) },
    monthly: monthly.map(row => ({ ...row, income: round(row.income), expenses: round(row.expenses), investment: round(row.investment) })),
    anomalies: { available: anomalyBaseline.length >= 2, items: anomalies, reason: anomalyBaseline.length < 2 ? "Choose at least 3 months so there are two completed baseline months." : anomalies.length ? null : "No category is at least 1.5× its recent median and ₹500 higher." },
    rule503020: income > 0 ? { available: true, needs: round(needs), wants: round(wants), savings: round(savings), income: round(income), needsPct: Math.round(needs / income * 100), wantsPct: Math.round(wants / income * 100), savingsPct: Math.round(savings / income * 100) } : { available: false, reason: "Credit income is required for this comparison." },
  };
}
