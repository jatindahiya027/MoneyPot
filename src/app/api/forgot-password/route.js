import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit, requestIdentity } from "@/libs/rateLimit";
import { normalizeEmail } from "@/libs/userIdentity.mjs";

export async function POST(request) {
  const body = await request.json();
  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ success: false, message: "Email required" }, { status: 400 });
  const rate = checkRateLimit(`forgot:${requestIdentity(request)}:${String(email).toLowerCase()}`, 4, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, message: "Too many reset requests. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const db = await getDb();
  const user = await db.get("SELECT userid, name FROM users WHERE lower(mail) = ?", [email]);

  // Always return success — prevent user enumeration
  if (!user) {
    return NextResponse.json({ success: true, message: "If that email exists, a reset link has been generated." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Invalidate old tokens for this user
  await db.run("UPDATE reset_tokens SET used=1 WHERE userid=? AND used=0", [user.userid]);
  await db.run(
    "INSERT INTO reset_tokens (userid, token, expires, used) VALUES (?, ?, ?, 0)",
    [user.userid, tokenHash, expires]
  );

  const resetUrl = new URL(`/reset-password?token=${token}`, request.url).toString();

  return NextResponse.json({
    success: true,
    message: "If that email exists, a reset link has been generated.",
    ...(process.env.MONEYPOT_DESKTOP === "1" ? { devResetUrl: resetUrl } : {}),
  });
}
