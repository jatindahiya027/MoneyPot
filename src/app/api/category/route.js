import { getDb } from "@/libs/db";
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
  const str = "SELECT c.* FROM categories c JOIN users_category_link l ON c.categoryid = l.categorykid WHERE l.userid = ?";
  const items = await db.all(str, [payload.id]);
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" }, status: 200 });
}
