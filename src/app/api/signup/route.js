import { getDb } from "@/libs/db";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getJwtSecretKey } from "@/libs/auth";


export async function POST(request) {
  const body = await request.json();

  const db = await getDb();
  // Check if the user exists and get their details
  const checkUserStr = `
    SELECT * FROM users WHERE mail = ?
  `;

  const user = await db.get(checkUserStr, [body.email]);
  if(!user){
    const str = `
    INSERT INTO users (name, age, mail, password, image) VALUES
     (?, ? ,? ,?,"/profile.png")
    `;
    // await db.run(str, [body.username, body.age, body.email, body.password]);
    const result = await db.run(str, [body.username, body.age, body.email, body.password]);
    const id = result.lastID;
    for (let i = 1; i < 14; i++) {
      const str3 = `
      INSERT INTO users_category_link (userid, categorykid) VALUES
       (?, ?)
      `;
      const result2 = await db.run(str3, [id,i]);
    }

  }
  else{
    return NextResponse.json({ success: false, user: "User already registered" }, { status: 401 });
  }

  return NextResponse.json({ success: true, user:"success" }, { status: 200, headers: { "content-type": "application/json" } });
}
