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

  const body = await req.json();

  if (!body.name || !body.type) {
    return NextResponse.json({ success: false, user: "name and type required" }, { status: 400 });
  }
  if (!["Debit", "Credit"].includes(body.type)) {
    return NextResponse.json({ success: false, user: "type must be Debit or Credit" }, { status: 400 });
  }
  // Sanitize category name length
  const name = String(body.name).trim().slice(0, 50);
  if (!name) return NextResponse.json({ success: false, user: "Invalid name" }, { status: 400 });

  const db = await getDb();
  const result = await db.run(
    "INSERT INTO categories (type, imgpath, name, fill) VALUES (?, '/others.png', ?, ?)",
    [body.type, name, body.fill || "#888888"]
  );
  await db.run(
    "INSERT INTO users_category_link (userid, categorykid) VALUES (?, ?)",
    [payload.id, result.lastID]
  );

  return NextResponse.json({ success: true });
}
