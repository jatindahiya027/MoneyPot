import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getJwtSecretKey } from "@/libs/auth";

let db = null;

export async function POST(request) {
  const body = await request.json();

  if (!db) {
    db = await open({
      filename: "./collection.db",
      driver: sqlite3.Database,
    });
  }

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
