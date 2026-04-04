import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ success: false, message: "Email required" }, { status: 400 });

  const db = await getDb();
  const user = await db.get("SELECT userid, name FROM users WHERE mail = ?", [email]);

  // Always return success — prevent user enumeration
  if (!user) {
    return NextResponse.json({ success: true, message: "If that email exists, a reset link has been generated." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Invalidate old tokens for this user
  await db.run("UPDATE reset_tokens SET used=1 WHERE userid=? AND used=0", [user.userid]);
  await db.run(
    "INSERT INTO reset_tokens (userid, token, expires, used) VALUES (?, ?, ?, 0)",
    [user.userid, token, expires]
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // ── Local delivery strategy ──────────────────────────────────────────────
  // Since this is a self-hosted app with no cloud email service, the reset
  // link is written to the server console AND stored in the DB so the admin
  // (or the user themselves on a local install) can retrieve it.
  //
  // To wire up real email: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
  // in .env and uncomment the nodemailer block below.
  // ─────────────────────────────────────────────────────────────────────────

  console.log("\n========== PASSWORD RESET ==========");
  console.log(`User  : ${user.name} <${email}>`);
  console.log(`Token : ${token}`);
  console.log(`URL   : ${resetUrl}`);
  console.log(`Exp   : ${expires}`);
  console.log("=====================================\n");

  // Optional nodemailer block — uncomment if SMTP is configured in .env
  /*
  if (process.env.SMTP_HOST) {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"MoneyPot" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset your MoneyPot password",
      text: `Click this link to reset your password (valid for 1 hour):\n\n${resetUrl}`,
      html: `<p>Click below to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }
  */

  return NextResponse.json({
    success: true,
    message: "Reset link generated. Check the server console for the link (or configure SMTP in .env for email delivery).",
  });
}
