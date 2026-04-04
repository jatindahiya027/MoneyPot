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

  // Validate email format if provided
  if (body.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.mail)) {
    return NextResponse.json({ success: false, user: "Invalid email" }, { status: 400 });
  }

  const db = await getDb();

  // Only update the authenticated user's own record
  await db.run(
    "UPDATE users SET name=?, age=?, mail=?, image=? WHERE userid=?",
    [body.name, body.age || null, body.mail, body.img, payload.id]
  );

  return NextResponse.json({ success: true });
}
