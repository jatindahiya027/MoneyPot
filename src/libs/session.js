import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getJwtSecretKey } from "@/libs/auth";

export async function createSessionResponse(user, extra = {}) {
  const token = await new SignJWT({ username: user.mail, id: user.userid, auth_method: extra.auth_method || "password" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("moneypot")
    .setAudience("moneypot-desktop")
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecretKey());

  const response = NextResponse.json({
    success: true,
    user: { userid: user.userid, name: user.name, mail: user.mail },
    ...extra,
  });
  response.cookies.set({
    name: "token",
    value: token,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.MONEYPOT_DESKTOP !== "1",
    maxAge: 60 * 60 * 24,
  });
  return response;
}
