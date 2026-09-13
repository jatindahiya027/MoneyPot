import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { createSessionResponse } from "@/libs/session";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9Z0fNwPNCROqDFmJlMZrQfW7fKxWj7y";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const userid = Number(body.userid);
  const pin = String(body.pin || "");
  if (!Number.isInteger(userid) || userid < 1 || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ success: false, error: "Enter a valid six-digit PIN." }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.get(`
    SELECT users.userid, users.name, users.mail, user_preferences.pin_hash,
           user_preferences.pin_enabled, user_preferences.pin_failed_attempts,
           user_preferences.pin_locked_until
    FROM users
    LEFT JOIN user_preferences ON user_preferences.userid=users.userid
    WHERE users.userid=?
  `, [userid]);

  if (!user?.pin_enabled || !user.pin_hash) {
    await bcrypt.compare(pin, DUMMY_HASH);
    return NextResponse.json({ success: false, error: "PIN sign-in is unavailable for this profile." }, { status: 401 });
  }

  const now = Date.now();
  const lockedUntil = Number(user.pin_locked_until || 0);
  if (lockedUntil > now) {
    return NextResponse.json({
      success: false,
      error: "Too many attempts. Use your password or try again shortly.",
      retry_after: Math.ceil((lockedUntil - now) / 1000),
    }, { status: 429 });
  }

  const matches = await bcrypt.compare(pin, user.pin_hash);
  if (!matches) {
    const attempts = Number(user.pin_failed_attempts || 0) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await db.run(
        "UPDATE user_preferences SET pin_failed_attempts=0, pin_locked_until=?, updated_at=datetime('now') WHERE userid=?",
        [now + LOCK_MS, userid]
      );
      return NextResponse.json({
        success: false,
        error: "Too many attempts. PIN sign-in is locked for five minutes.",
        retry_after: LOCK_MS / 1000,
      }, { status: 429 });
    }
    await db.run(
      "UPDATE user_preferences SET pin_failed_attempts=?, pin_locked_until=0, updated_at=datetime('now') WHERE userid=?",
      [attempts, userid]
    );
    return NextResponse.json({
      success: false,
      error: "Incorrect PIN.",
      remaining_attempts: MAX_ATTEMPTS - attempts,
    }, { status: 401 });
  }

  await db.run(
    "UPDATE user_preferences SET pin_failed_attempts=0, pin_locked_until=0, updated_at=datetime('now') WHERE userid=?",
    [userid]
  );
  return createSessionResponse(user, { auth_method: "pin" });
}
