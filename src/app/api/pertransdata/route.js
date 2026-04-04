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

  const { edittrans } = await req.json();
  if (!edittrans) return NextResponse.json({ success: false }, { status: 400 });

  const db = await getDb();

  // Verify this transaction belongs to the requesting user before returning it
  const link = await db.get(
    "SELECT 1 FROM users_transcation_link WHERE userid=? AND transid=?",
    [payload.id, edittrans]
  );
  if (!link) return NextResponse.json({ success: false }, { status: 404 });

  const result = await db.all(
    "SELECT * FROM transactions WHERE transid=?",
    [edittrans]
  );

  return NextResponse.json({ result });
}
