import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const body = await request.json();

  // Basic validation
  if (!body.email || !body.password || !body.username) {
    return NextResponse.json({ success: false, user: "Missing required fields" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ success: false, user: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ success: false, user: "Invalid email address" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.get("SELECT userid FROM users WHERE mail = ?", [body.email]);
  if (existing) {
    return NextResponse.json({ success: false, user: "User already registered" }, { status: 409 });
  }

  // Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(body.password, 12);

  const result = await db.run(
    `INSERT INTO users (name, age, mail, password, image) VALUES (?, ?, ?, ?, '/profile.png')`,
    [body.username, body.age || null, body.email, passwordHash]
  );
  const id = result.lastID;

  // Link default categories
  for (let i = 1; i < 14; i++) {
    await db.run("INSERT INTO users_category_link (userid, categorykid) VALUES (?, ?)", [id, i]);
  }

  return NextResponse.json({ success: true, user: "success" }, { status: 200 });
}
