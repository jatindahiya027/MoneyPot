import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ success: false, message: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = await getDb();

  const resetRecord = await db.get(
    "SELECT tokenid, userid, expires, used FROM reset_tokens WHERE token = ?",
    [token]
  );

  if (!resetRecord) {
    return NextResponse.json({ success: false, message: "Invalid or expired reset link" }, { status: 400 });
  }
  if (resetRecord.used) {
    return NextResponse.json({ success: false, message: "This reset link has already been used" }, { status: 400 });
  }
  if (new Date(resetRecord.expires) < new Date()) {
    return NextResponse.json({ success: false, message: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.run("UPDATE users SET password = ? WHERE userid = ?", [passwordHash, resetRecord.userid]);
  await db.run("UPDATE reset_tokens SET used = 1 WHERE tokenid = ?", [resetRecord.tokenid]);

  return NextResponse.json({ success: true, message: "Password updated successfully" });
}
