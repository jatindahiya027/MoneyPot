import { getDb } from "@/libs/db";
import { parse } from 'json2csv';
import { verifyJwtToken } from "@/libs/auth";

async function authenticate(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try { return await verifyJwtToken(token); } catch { return null; }
}

export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  const db = await getDb();
  const str = "SELECT t.* FROM transactions t JOIN users_transcation_link l ON t.transid = l.transid WHERE l.userid = ? ORDER BY t.date DESC";
  let items = await db.all(str, [payload.id]);
  if (items.length === 0) items = [{ "Data": "No Data Found" }];
  try {
    const csv = parse(items);
    return new Response(csv, {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=transactions.csv" },
      status: 200,
    });
  } catch (err) {
    console.error('Error converting to CSV:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
