const TYPES = new Set(["Debit", "Credit", "Investment"]);

function validCalendarDate(year, month, day) {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
}

function isoDate(year, month, day) {
  if (!validCalendarDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseTransactionDate(raw) {
  const value = String(raw || "").trim();
  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (match) return isoDate(Number(match[3]), Number(match[2]), Number(match[1]));

  match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/);
  if (match) {
    const year = Number(match[3]) >= 50 ? 1900 + Number(match[3]) : 2000 + Number(match[3]);
    return isoDate(year, Number(match[2]), Number(match[1]));
  }

  const monthNames = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})$/);
  if (match) return isoDate(Number(match[3]), monthNames[match[2].toLowerCase()], Number(match[1]));
  return null;
}

export function normalizeTransactionAmount(type, category, raw) {
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  const isRedemption = type === "Investment" && /redemption/i.test(String(category || ""));
  if (isRedemption) return -Math.abs(amount);
  if (amount < 0) return null;
  return amount;
}

export function normalizeTransactionInput(input) {
  const type = String(input?.type || "").trim();
  const category = String(input?.category || "").trim().slice(0, 50);
  const date = parseTransactionDate(input?.date);
  const amount = normalizeTransactionAmount(type, category, input?.amount);
  if (!TYPES.has(type)) return { error: "Type must be Debit, Credit, or Investment." };
  if (!category) return { error: "Choose a category." };
  if (!date) return { error: "Enter a real calendar date." };
  if (amount === null) return { error: "Enter a valid non-negative amount." };
  return {
    value: {
      type,
      category,
      date,
      amount,
      description: String(input?.description || "").trim().slice(0, 300),
      bank_name: String(input?.bank_name || "").trim().slice(0, 80),
    },
  };
}

export async function userHasCategory(db, userid, type, category) {
  return Boolean(await db.get(`
    SELECT 1
    FROM categories c
    JOIN users_category_link l ON l.categorykid=c.categoryid
    WHERE l.userid=? AND c.type=? AND lower(c.name)=lower(?)
    LIMIT 1
  `, [userid, type, category]));
}

export function preservesExistingTransactionCategory(current, next) {
  return current?.type === next?.type
    && String(current?.category || "").toLowerCase() === String(next?.category || "").toLowerCase();
}
