import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function authenticatedUser(request) {
  const bearer = request.headers.get("Authorization")?.split(" ")[1];
  const cookie = request.cookies.get("token")?.value;
  return verifyJwtToken(bearer || cookie || "");
}

async function ensurePreferences(db, userid) {
  await db.run(
    "INSERT OR IGNORE INTO user_preferences (userid, default_bank, banks) VALUES (?, '', '[]')",
    [userid]
  );
}

async function readPreference(db, userid) {
  const row = await db.get(`
    SELECT users.userid, users.name, users.mail, user_preferences.pin_enabled,
           user_preferences.pin_prompted, user_preferences.pin_hash
    FROM users
    JOIN user_preferences ON user_preferences.userid=users.userid
    WHERE users.userid=?
  `, [userid]);
  return {
    userid: Number(row.userid),
    name: row.name,
    mail: row.mail,
    pin_enabled: Boolean(row.pin_enabled && row.pin_hash),
    pin_prompted: Boolean(row.pin_prompted),
  };
}

export async function GET(request) {
  const payload = await authenticatedUser(request);
  if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  await ensurePreferences(db, payload.id);
  return NextResponse.json({ success: true, security: await readPreference(db, payload.id) });
}

export async function POST(request) {
  const payload = await authenticatedUser(request);
  if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const db = await getDb();
  await ensurePreferences(db, payload.id);

  if ((action === "set" || action === "disable") && payload.auth_method !== "password") {
    return NextResponse.json({ success: false, error: "Sign in with your password before changing PIN security." }, { status: 403 });
  }

  if (action === "set") {
    const pin = String(body.pin || "");
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: "PIN must contain exactly six digits." }, { status: 400 });
    }
    const pinHash = await bcrypt.hash(pin, 12);
    await db.run(`
      UPDATE user_preferences
      SET pin_enabled=1, pin_prompted=1, pin_hash=?, pin_failed_attempts=0,
          pin_locked_until=0, updated_at=datetime('now')
      WHERE userid=?
    `, [pinHash, payload.id]);
  } else if (action === "dismiss") {
    await db.run(
      "UPDATE user_preferences SET pin_prompted=1, updated_at=datetime('now') WHERE userid=?",
      [payload.id]
    );
  } else if (action === "disable") {
    await db.run(`
      UPDATE user_preferences
      SET pin_enabled=0, pin_prompted=1, pin_hash='', pin_failed_attempts=0,
          pin_locked_until=0, updated_at=datetime('now')
      WHERE userid=?
    `, [payload.id]);
  } else {
    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  }

  return NextResponse.json({ success: true, security: await readPreference(db, payload.id) });
}
