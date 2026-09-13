export function listRecentMonths(monthsBack, now = new Date()) {
  const months = [];
  for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    months.push(`${date.getFullYear()}-${month}`);
  }
  return months;
}

export async function queryMonthlyTotals(db, userId, startMonth, endMonth) {
  return db.all(`
    SELECT
      substr(t.date, 1, 7) AS month,
      SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type='Debit' THEN t.amount ELSE 0 END) AS expenses,
      SUM(CASE WHEN t.type='Investment' THEN t.amount ELSE 0 END) AS investment
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
      AND lower(COALESCE(t.category, '')) NOT LIKE '%self%'
      AND t.category <> 'Opening balance'
      AND substr(t.date, 1, 7) >= ?
      AND substr(t.date, 1, 7) <= ?
    GROUP BY substr(t.date, 1, 7)
    ORDER BY month ASC
  `, [userId, startMonth, endMonth]);
}

export async function queryMonthlyDebitCategories(db, userId, startMonth, endMonth) {
  return db.all(`
    SELECT
      substr(t.date, 1, 7) AS month,
      t.category,
      SUM(t.amount) AS total
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
      AND t.type = 'Debit'
      AND lower(COALESCE(t.category, '')) NOT LIKE '%self%'
      AND t.category <> 'Opening balance'
      AND substr(t.date, 1, 7) >= ?
      AND substr(t.date, 1, 7) <= ?
    GROUP BY substr(t.date, 1, 7), t.category
    ORDER BY month ASC, total DESC
  `, [userId, startMonth, endMonth]);
}
