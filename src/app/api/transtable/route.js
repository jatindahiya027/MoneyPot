import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function authenticate(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try { return await verifyJwtToken(token); } catch { return null; }
}

const UNAUTH = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401, headers: { "Content-Type": "application/json" },
});
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// Merge flat rows [{date, bank, credit, debit}] into
// [{date, Credit, Debit, banks: [{bank, credit, debit}]}]
function mergeRows(flat) {
  const byDate = {};
  for (const r of flat) {
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, Credit: 0, Debit: 0, banks: {} };
    byDate[r.date].Credit += r.credit;
    byDate[r.date].Debit  += r.debit;
    const b = r.bank || "Unknown";
    if (!byDate[r.date].banks[b]) byDate[r.date].banks[b] = { bank: b, credit: 0, debit: 0 };
    byDate[r.date].banks[b].credit += r.credit;
    byDate[r.date].banks[b].debit  += r.debit;
  }
  return Object.values(byDate)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .map(d => ({ ...d, banks: Object.values(d.banks).sort((a,b) => (b.credit+b.debit)-(a.credit+a.debit)) }));
}

const QUERY = (where) => `
  SELECT
    t.date,
    COALESCE(NULLIF(TRIM(t.bank_name),''), 'Unknown') AS bank,
    SUM(CASE WHEN t.type='Credit' THEN t.amount ELSE 0 END) AS credit,
    SUM(CASE WHEN t.type='Debit'  THEN t.amount ELSE 0 END) AS debit
  FROM transactions t
  JOIN users_transcation_link l ON t.transid = l.transid
  WHERE l.userid = ? ${where}
  GROUP BY t.date, bank
  ORDER BY t.date ASC
`;

export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return UNAUTH;
  const db = await getDb();
  const rows = await db.all(QUERY(""), [payload.id]);
  return new Response(JSON.stringify(mergeRows(rows)), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}

export async function POST(req) {
  const payload = await authenticate(req);
  if (!payload) return UNAUTH;
  const db = await getDb();
  const { StartDate, EndDate } = await req.json();
  const startDate = ISO_RE.test(StartDate) ? StartDate : "2000-01-01";
  const endDate   = ISO_RE.test(EndDate)   ? EndDate   : "2099-12-31";
  const rows = await db.all(QUERY("AND t.date BETWEEN ? AND ?"), [payload.id, startDate, endDate]);
  return new Response(JSON.stringify(mergeRows(rows)), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}
