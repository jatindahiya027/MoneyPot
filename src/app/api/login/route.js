import { getDb } from "@/libs/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionResponse } from "@/libs/session";
import { checkRateLimit, requestIdentity } from "@/libs/rateLimit";
import { normalizeEmail } from "@/libs/userIdentity.mjs";

const DUMMY_HASH = "$2a$12$dLwtm3jUkSMMxDpBFEbAV.zqIMsX21gvyenpLfDY307aVv6oMz28i";

export async function POST(request) {
  const body = await request.json();

  const userid = Number(body.userid);
  const email = normalizeEmail(body.username);
  const accountKey = Number.isInteger(userid) && userid > 0 ? `id:${userid}` : `mail:${email}`;
  const rate = checkRateLimit(`login:${requestIdentity(request)}:${accountKey}`, 8, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ success: false, error: "Too many sign-in attempts. Try again shortly." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfter) },
    });
  }

  if ((!email && !(Number.isInteger(userid) && userid > 0)) || !body.password) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const db = await getDb();
  const user = Number.isInteger(userid) && userid > 0
    ? await db.get("SELECT userid,name,mail,password FROM users WHERE userid=?", [userid])
    : await db.get("SELECT userid,name,mail,password FROM users WHERE lower(mail)=?", [email]);

  if (!user) {
    // Constant-time response — prevents user enumeration via timing
    await bcrypt.compare(String(body.password), DUMMY_HASH);
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(body.password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return createSessionResponse(user, { auth_method: "password" });
}
