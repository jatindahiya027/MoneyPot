import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
import path from "path";
import { unlink } from "fs/promises";
import { isAllowedProfileImage, normalizeEmail } from "@/libs/userIdentity.mjs";

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
  const name = String(body.name || "").trim();
  const mail = normalizeEmail(body.mail);
  const age = body.age === "" || body.age == null ? null : Number(body.age);
  const image = String(body.img || "/profile.png");

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ success: false, user: "Name must be between 2 and 80 characters" }, { status: 400 });
  }

  // Validate email format if provided
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    return NextResponse.json({ success: false, user: "Invalid email" }, { status: 400 });
  }
  if (age !== null && (!Number.isInteger(age) || age < 13 || age > 120)) {
    return NextResponse.json({ success: false, user: "Invalid age" }, { status: 400 });
  }
  if (!isAllowedProfileImage(image)) {
    return NextResponse.json({ success: false, user: "Invalid profile image" }, { status: 400 });
  }

  const db = await getDb();
  const duplicate = await db.get(
    "SELECT userid FROM users WHERE lower(mail)=? AND userid<>?",
    [mail, payload.id]
  );
  if (duplicate) {
    return NextResponse.json({ success: false, user: "That email is already used by another account." }, { status: 409 });
  }
  const current = await db.get("SELECT image FROM users WHERE userid=?", [payload.id]);

  // Only update the authenticated user's own record
  await db.run(
    "UPDATE users SET name=?, age=?, mail=?, image=? WHERE userid=?",
    [name, age, mail, image, payload.id]
  );

  if (current?.image !== image && String(current?.image || "").startsWith("/uploads/")) {
    const shared = await db.get("SELECT 1 FROM users WHERE image=? LIMIT 1", [current.image]);
    if (!shared) {
      const uploadsDir = process.env.MONEYPOT_DATA_DIR
        ? path.join(process.env.MONEYPOT_DATA_DIR, "uploads")
        : path.join(process.cwd(), "public", "uploads");
      await unlink(path.join(uploadsDir, path.basename(current.image))).catch(() => {});
    }
  }

  return NextResponse.json({ success: true });
}
