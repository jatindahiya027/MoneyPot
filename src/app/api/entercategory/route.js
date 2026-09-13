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
  if (!["Debit", "Credit", "Investment"].includes(body.type)) {
    return NextResponse.json({ success: false, user: "type must be Debit, Credit, or Investment" }, { status: 400 });
  }
  // Sanitize category name length
  const name = String(body.name).trim().slice(0, 50);
  if (!name) return NextResponse.json({ success: false, user: "Invalid name" }, { status: 400 });
  const icon = String(body.icon || "Sparkles").replace(/[^A-Za-z0-9]/g, "").slice(0, 40) || "Sparkles";

  const db = await getDb();
  const duplicate = await db.get(`
    SELECT 1 FROM categories c
    JOIN users_category_link l ON l.categorykid=c.categoryid
    WHERE l.userid=? AND c.type=? AND lower(c.name)=lower(?)
  `, [payload.id, body.type, name]);
  if (duplicate) return NextResponse.json({ success: false, user: "Category already exists" }, { status: 409 });

  await db.exec("BEGIN IMMEDIATE");
  try {
    const result = await db.run(
      "INSERT INTO categories (type, imgpath, name, fill) VALUES (?, ?, ?, ?)",
      [body.type, `lucide:${icon}`, name, body.fill || "#888888"]
    );
    await db.run(
      "INSERT INTO users_category_link (userid, categorykid) VALUES (?, ?)",
      [payload.id, result.lastID]
    );
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }

  return NextResponse.json({ success: true });
}
