import { getDb } from "@/libs/db";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getJwtSecretKey } from "@/libs/auth";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const body = await request.json();

  if (!body.username || !body.password) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.get(
    "SELECT userid, mail, password FROM users WHERE mail = ?",
    [body.username]
  );

  if (!user) {
    // Constant-time response — prevents user enumeration via timing
    await bcrypt.compare("dummy", "$2b$12$invalidhashpadding000000000000000000000000000000000000.");
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(body.password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const token = await new SignJWT({ username: body.username, id: user.userid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());

  const response = NextResponse.json(
    { success: true, token },   // ← token in body so client JS can store it
    { status: 200 }
  );

  // HttpOnly cookie used by Next.js middleware for server-side route protection.
  // Client-side fetch calls use the token from localStorage (set by login page via setToken).
  response.cookies.set({
    name: "token",
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
