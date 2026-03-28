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

export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return UNAUTH;
  const db = await getDb();
  const items = await db.all(`
    SELECT
      t.date,
      SUM(CASE WHEN t.type = 'Credit' THEN t.amount ELSE 0 END) AS Credit,
      SUM(CASE WHEN t.type = 'Debit'  THEN t.amount ELSE 0 END) AS Debit
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ?
    GROUP BY t.date
    ORDER BY t.date ASC
  `, [payload.id]);
  return new Response(JSON.stringify(items), {
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

  const items = await db.all(`
    SELECT
      t.date,
      SUM(CASE WHEN t.type = 'Credit' THEN t.amount ELSE 0 END) AS Credit,
      SUM(CASE WHEN t.type = 'Debit'  THEN t.amount ELSE 0 END) AS Debit
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE l.userid = ? AND t.date BETWEEN ? AND ?
    GROUP BY t.date
    ORDER BY t.date ASC
  `, [payload.id, startDate, endDate]);
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}