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

  // Verify this category belongs to the user before deleting
  const link = await db.get(
    "SELECT 1 FROM users_category_link WHERE userid=? AND categorykid=?",
    [payload.id, id]
  );
  if (!link) return NextResponse.json({ success: false }, { status: 404 });

  const cat = await db.get("SELECT name FROM categories WHERE categoryid=?", [id]);
  if (!cat) return NextResponse.json({ success: false }, { status: 404 });

  await db.run("DELETE FROM categories WHERE categoryid=?", [id]);
  await db.run(
    "DELETE FROM users_category_link WHERE userid=? AND categorykid=?",
    [payload.id, id]
  );
  // Reassign orphaned transactions to Miscellaneous
  await db.run(
    `UPDATE transactions SET category='Miscellaneous'
     WHERE transid IN (SELECT transid FROM users_transcation_link WHERE userid=?)
     AND category=?`,
    [payload.id, cat.name]
  );

  return NextResponse.json({ success: true });
}
