import { getDb } from "@/libs/db";
import { parse } from 'json2csv';
import { verifyJwtToken } from "@/libs/auth";

function spreadsheetSafe(value) {
  if (typeof value !== "string") return value;
  return /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
}

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

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
    return new Response(JSON.stringify({ error: "Invalid date format" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filters = ["l.userid = ?"];
  const params = [payload.id];
  if (startDate) {
    filters.push("t.date >= ?");
    params.push(startDate);
  }
  if (endDate) {
    filters.push("t.date <= ?");
    params.push(endDate);
  }

  const str = `
    SELECT t.*
    FROM transactions t
    JOIN users_transcation_link l ON t.transid = l.transid
    WHERE ${filters.join(" AND ")}
    ORDER BY t.date DESC
  `;
  let items = (await db.all(str, params)).map(item => Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, spreadsheetSafe(value)])
  ));
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
