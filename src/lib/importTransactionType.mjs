const CREDIT_MARKER = /(?:^|[\s/|:()_-])(?:cr|credit|deposit|received|income)(?=$|[\s/|:()_-])/i;
const DEBIT_MARKER = /(?:^|[\s/|:()_-])(?:dr|debit|withdrawal|paid|expense)(?=$|[\s/|:()_-])/i;

export function parseStatementAmount(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return 0;
  const parenthesized = /^\(.*\)$/.test(text);
  const value = Number.parseFloat(text.replace(/[₹$£€,'\s()]/g, ""));
  if (!Number.isFinite(value)) return 0;
  return parenthesized ? -Math.abs(value) : value;
}

export function hasSignedAmounts(values = []) {
  let positive = false;
  let negative = false;
  for (const raw of values) {
    const amount = parseStatementAmount(raw);
    if (amount > 0) positive = true;
    if (amount < 0) negative = true;
  }
  return positive && negative;
}

function typeFromText(value) {
  const text = String(value || "");
  if (CREDIT_MARKER.test(text)) return "Credit";
  if (DEBIT_MARKER.test(text)) return "Debit";
  return "";
}

function typeFromNarration(value) {
  const narration = String(value || "");
  if (/\b(?:credit\s*card\s*(?:payment|purchase|bill)|purchase|bill\s*pay|charges?|fees?|atm|pos|upi\s+(?:sent|payment)|transfer\s+out)\b/i.test(narration)) return "Debit";
  if (/\b(?:salary|payroll|refund|cashback|reversal|dividend|interest\s+(?:paid|credited|capitalised)|int\.\s*pd|transfer\s+in)\b/i.test(narration)) return "Credit";
  return typeFromText(narration);
}

export function inferImportedTransactionType({
  withdrawal = 0,
  deposit = 0,
  typeValue = "",
  amountValue = 0,
  signedAmountColumn = false,
  description = "",
  fallback = "Debit",
} = {}) {
  if (Math.abs(parseStatementAmount(withdrawal)) > 0) return "Debit";
  if (Math.abs(parseStatementAmount(deposit)) > 0) return "Credit";

  const explicit = typeFromText(typeValue);
  if (explicit) return explicit;

  const amountTextType = typeFromText(amountValue);
  if (amountTextType) return amountTextType;

  const amount = parseStatementAmount(amountValue);
  if (signedAmountColumn && amount !== 0) return amount < 0 ? "Debit" : "Credit";
  if (amount < 0) return "Debit";

  const narrationType = typeFromNarration(description);
  if (narrationType) return narrationType;
  return ["Debit", "Credit", "Investment"].includes(fallback) ? fallback : "Debit";
}
