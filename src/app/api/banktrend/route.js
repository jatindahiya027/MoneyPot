import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function authenticate(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const t = h.split(" ")[1];
  return t ? await verifyJwtToken(t) : null;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNAUTH = new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401, headers: { "Content-Type": "application/json" },
});

// GET — all-time per-bank totals
export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return UNAUTH;
  const db = await getDb();

  const rows = await db.all(`
    SELECT
      COALESCE(NULLIF(TRIM(t.bank_name), ''), 'Unknown') AS bank,
      SUM(CASE WHEN t.type = 'Credit' THEN t.amount ELSE 0 END) AS credit,
      SUM(CASE WHEN t.type = 'Debit'  THEN t.amount ELSE 0 END) AS debit,
      COUNT(*) AS count
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
    GROUP BY bank
    ORDER BY (credit + debit) DESC
  `, [payload.id]);

  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}

// POST — per-bank totals filtered by date range
export async function POST(req) {
  const payload = await authenticate(req);
  if (!payload) return UNAUTH;
  const db = await getDb();
  const { StartDate, EndDate } = await req.json();

  const startDate = ISO_RE.test(StartDate) ? StartDate : "2000-01-01";
  const endDate   = ISO_RE.test(EndDate)   ? EndDate   : "2099-12-31";

  const rows = await db.all(`
    SELECT
      COALESCE(NULLIF(TRIM(t.bank_name), ''), 'Unknown') AS bank,
      SUM(CASE WHEN t.type = 'Credit' THEN t.amount ELSE 0 END) AS credit,
      SUM(CASE WHEN t.type = 'Debit'  THEN t.amount ELSE 0 END) AS debit,
      COUNT(*) AS count
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ? AND t.date BETWEEN ? AND ?
    GROUP BY bank
    ORDER BY (credit + debit) DESC
  `, [payload.id, startDate, endDate]);

  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}
