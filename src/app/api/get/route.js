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
  const items = await db.all("SELECT * FROM users WHERE userid = ?", [payload.id]);
  return new Response(JSON.stringify(items), { headers: { "Content-Type": "application/json" }, status: 200 });
}
