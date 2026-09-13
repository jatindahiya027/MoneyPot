export function isSelfTransfer(transaction) {
  return String(transaction.category || "").toLowerCase().includes("self");
}

const roundMoney = value => Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

export function summarizeTransactions(transactions, categoryFills = {}, startDate = "", endDate = "2099-12-31") {
  const rows = transactions.filter(t => t.date >= startDate && t.date <= endDate && !isSelfTransfer(t));
  const totals = { Credit: 0, Debit: 0, Investment: 0 };
  const counts = { Credit: 0, Debit: 0, Investment: 0 };
  const categoryMap = new Map();
  const bankMap = new Map();
  const dailyMap = new Map();

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (!(row.type in totals)) continue;
    totals[row.type] += amount;
    counts[row.type] += 1;
    const bank = String(row.bank_name || "").trim() || "Unknown";
    if (!bankMap.has(bank)) bankMap.set(bank, { bank, credit: 0, debit: 0, investment: 0, count: 0 });
    const bankRow = bankMap.get(bank);
    bankRow[row.type.toLowerCase()] += amount;
    bankRow.count += 1;

    const dailyKey = `${row.date}\u0000${bank}`;
    if (!dailyMap.has(dailyKey)) dailyMap.set(dailyKey, { date: row.date, bank, credit: 0, debit: 0, investment: 0 });
    dailyMap.get(dailyKey)[row.type.toLowerCase()] += amount;

    if (row.type === "Debit" && row.category !== "Opening balance") {
      const fill = categoryFills[`${row.type}\u0000${row.category}`] || categoryFills[row.category];
      const current = categoryMap.get(row.category) || { category: row.category, amount: 0, fill };
      current.amount += amount;
      categoryMap.set(row.category, current);
    }
  }

  const byDate = new Map();
  for (const row of dailyMap.values()) {
    if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date, Credit: 0, Debit: 0, Investment: 0, banks: [] });
    const day = byDate.get(row.date);
    day.Credit += row.credit;
    day.Debit += row.debit;
    day.Investment += row.investment;
    day.banks.push(row);
  }

  return {
    creditdebit: Object.keys(totals).map(type => ({ type, amount: roundMoney(totals[type]), count: counts[type] })),
    catamount: [...categoryMap.values()].map(row => ({ ...row, amount: roundMoney(row.amount) })).sort((a, b) => b.amount - a.amount),
    banktrend: [...bankMap.values()].map(row => ({
      ...row,
      credit: roundMoney(row.credit),
      debit: roundMoney(row.debit),
      investment: roundMoney(row.investment),
    })).sort((a, b) => (b.credit + b.debit + Math.abs(b.investment)) - (a.credit + a.debit + Math.abs(a.investment))),
    transtables: [...byDate.values()].map(row => ({
      ...row,
      Credit: roundMoney(row.Credit),
      Debit: roundMoney(row.Debit),
      Investment: roundMoney(row.Investment),
      banks: row.banks.map(bank => ({
        ...bank,
        credit: roundMoney(bank.credit),
        debit: roundMoney(bank.debit),
        investment: roundMoney(bank.investment),
      })),
    })).sort((a, b) => a.date.localeCompare(b.date)),
    balance: roundMoney(totals.Credit - totals.Debit - totals.Investment),
    savings: roundMoney(totals.Credit - totals.Debit),
  };
}
