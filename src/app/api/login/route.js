import { getDb } from "@/libs/db";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getJwtSecretKey } from "@/libs/auth";


export async function POST(request) {
  const body = await request.json();

  const db = await getDb();
  const str = `
    SELECT userid, mail, password FROM users WHERE mail=? AND password=?
  `;

  const items = await db.all(str, [body.username, body.password]);

  if (items.length > 0) {
    const user = items[0];
    if (body.username === user.mail && body.password === user.password) {
      const token = await new SignJWT({
        username: body.username,
        id: user.userid,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30m")
        .sign(getJwtSecretKey());

      const response = NextResponse.json(
        { success: true },
        { status: 200, headers: { "content-type": "application/json" } }
      );
      response.cookies.set({
        name: "token",
        value: token,
        path: "/",
      });
      return response;
    }
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
