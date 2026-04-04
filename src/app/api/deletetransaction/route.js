import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const t = h.split(" ")[1];
  return t ? await verifyJwtToken(t) : null;
}

export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ success: false }, { status: 400 });

  const db = await getDb();

  // Verify ownership before deleting — prevents deleting another user's transaction
  const link = await db.get(
    "SELECT 1 FROM users_transcation_link WHERE userid=? AND transid=?",
    [payload.id, id]
  );
  if (!link) return NextResponse.json({ success: false }, { status: 404 });

  await db.run("DELETE FROM transactions WHERE transid=?", [id]);
  await db.run(
    "DELETE FROM users_transcation_link WHERE userid=? AND transid=?",
    [payload.id, id]
  );

  return NextResponse.json({ success: true });
}
