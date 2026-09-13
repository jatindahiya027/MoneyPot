import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function authenticate(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try { return await verifyJwtToken(token); } catch { return null; }
}

const unauthorized = () => new Response(JSON.stringify({ error: "Unauthorized" }), {
  status: 401,
  headers: { "Content-Type": "application/json" },
});

// GET — all-time totals (no date filter)
export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return unauthorized();
  const db = await getDb();
  const items = await db.all(`
    WITH classified AS (
      SELECT t.type AS entity, t.amount AS amount
      FROM transactions t
      JOIN users_transcation_link l ON t.transid = l.transid
      WHERE l.userid = ?
        AND lower(COALESCE(t.category, '')) NOT LIKE '%self%'
        AND t.type IN ('Credit', 'Debit', 'Investment')
    )
    SELECT entity AS type, ROUND(SUM(amount),2) AS amount, COUNT(*) AS count
    FROM classified
    GROUP BY entity
  `, [payload.id]);
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}

// POST — totals filtered by date range
// Body: { StartDate: "YYYY-MM-DD", EndDate: "YYYY-MM-DD" }
export async function POST(req) {
  const payload = await authenticate(req);
  if (!payload) return unauthorized();
  const db = await getDb();
  const { StartDate, EndDate } = await req.json();

  // Both values must already be YYYY-MM-DD coming from the frontend.
  // Validate format and fall back to safe defaults if anything is malformed.
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const startDate = ISO_RE.test(StartDate) ? StartDate : "";
  const endDate   = ISO_RE.test(EndDate)   ? EndDate   : "2099-12-31";

  const items = await db.all(`
    WITH classified AS (
      SELECT t.type AS entity, t.amount AS amount
      FROM transactions t
      JOIN users_transcation_link l ON t.transid = l.transid
      WHERE l.userid = ?
        AND t.date BETWEEN ? AND ?
        AND lower(COALESCE(t.category, '')) NOT LIKE '%self%'
        AND t.type IN ('Credit', 'Debit', 'Investment')
    )
    SELECT entity AS type, ROUND(SUM(amount),2) AS amount, COUNT(*) AS count
    FROM classified
    GROUP BY entity
  `, [payload.id, startDate, endDate]);
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" }, status: 200,
  });
}
