import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ensureDefaultCategories } from "@/libs/defaultCategories";
import { checkRateLimit, requestIdentity } from "@/libs/rateLimit";
import { normalizeEmail } from "@/libs/userIdentity.mjs";

export async function POST(request) {
 try {
  const body = await request.json();
  const rate = checkRateLimit(`signup:${requestIdentity(request)}`, 5, 60 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ success: false, user: "Too many account creation attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  // Basic validation
  if (!body.email || !body.password || !body.username) {
    return NextResponse.json({ success: false, user: "Missing required fields" }, { status: 400 });
  }
  const username = String(body.username).trim();
  const email = normalizeEmail(body.email);
  const age = body.age === "" || body.age == null ? null : Number(body.age);
  if (username.length < 2 || username.length > 80) {
    return NextResponse.json({ success: false, user: "Name must be between 2 and 80 characters" }, { status: 400 });
  }
  if (age !== null && (!Number.isInteger(age) || age < 13 || age > 120)) {
    return NextResponse.json({ success: false, user: "Enter a valid age" }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ success: false, user: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, user: "Invalid email address" }, { status: 400 });
  }
  const pin = String(body.pin || "");
  if (pin && !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ success: false, user: "PIN must contain exactly six digits" }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.get("SELECT userid FROM users WHERE lower(mail) = ?", [email]);
  if (existing) {
    return NextResponse.json({ success: false, user: "User already registered" }, { status: 409 });
  }

  // Cost 10 keeps first-run account creation responsive on lower-power Windows devices.
  const passwordHash = await bcrypt.hash(body.password, 10);
  const pinHash = pin ? await bcrypt.hash(pin, 12) : "";
  const categoryIds = await ensureDefaultCategories(db);
  await db.exec("BEGIN IMMEDIATE");
  try {
    const result = await db.run(`INSERT INTO users (name, age, mail, password, image) VALUES (?, ?, ?, ?, '/profile.png')`, [username, age, email, passwordHash]);
    const id = result.lastID;
    for (const categoryId of categoryIds) await db.run("INSERT OR IGNORE INTO users_category_link (userid, categorykid) VALUES (?, ?)", [id, categoryId]);
    await db.run(`
      INSERT OR REPLACE INTO user_preferences
        (userid, default_bank, banks, pin_enabled, pin_prompted, pin_hash,
         pin_failed_attempts, pin_locked_until)
      VALUES (?, '', '[]', ?, 1, ?, 0, 0)
    `, [id, pinHash ? 1 : 0, pinHash]);
    await db.exec("COMMIT");
  } catch (error) { await db.exec("ROLLBACK"); throw error; }

  return NextResponse.json({ success: true, user: "success" }, { status: 200 });
 } catch (error) {
  console.error("Signup failed:", error);
  return NextResponse.json({ success:false, user:"Account creation failed. Please restart MoneyPot and try again." }, { status:500 });
 }
}
