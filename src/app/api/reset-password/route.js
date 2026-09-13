import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { checkRateLimit, requestIdentity } from "@/libs/rateLimit";

export async function POST(request) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ success: false, message: "Token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
  }

  const rate = checkRateLimit(`reset:${requestIdentity(request)}`, 8, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many reset attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const db = await getDb();
  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
  const passwordHash = await bcrypt.hash(password, 12);

  await db.exec("BEGIN IMMEDIATE");
  let resetRecord;
  try {
    resetRecord = await db.get(
      "SELECT tokenid, userid, expires, used FROM reset_tokens WHERE token = ?",
      [tokenHash]
    );

    if (!resetRecord || resetRecord.used || new Date(resetRecord.expires) < new Date()) {
      await db.exec("ROLLBACK");
      return NextResponse.json({ success: false, message: "Invalid or expired reset link" }, { status: 400 });
    }
    await db.run("UPDATE users SET password = ? WHERE userid = ?", [passwordHash, resetRecord.userid]);
    await db.run(
      `UPDATE user_preferences SET pin_enabled=0, pin_prompted=1, pin_hash='',
       pin_failed_attempts=0, pin_locked_until=0,
       updated_at=datetime('now') WHERE userid=?`,
      [resetRecord.userid]
    );
    await db.run("UPDATE reset_tokens SET used = 1 WHERE tokenid = ? AND used=0", [resetRecord.tokenid]);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK").catch(() => {});
    throw error;
  }

  return NextResponse.json({ success: true, message: "Password updated successfully" });
}
