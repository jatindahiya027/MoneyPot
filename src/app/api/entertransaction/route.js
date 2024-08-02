import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { jwtVerify } from "jose";
import { getJwtSecretKey } from "@/libs/auth"; // Adjust the path based on your project structure
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
// Initialize the database instance as null initially
let db = null;
let payload = null;


export async function POST(req, res) {
  const body = await req.json();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false,user:"authorization header missing" }, { status: 401 });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(" ")[1];
  if (!token) {
    return NextResponse.json({ success: false,user:"token missing" }, { status: 401 });
  }

  try {
    // Verify the JWT token
     payload = await verifyJwtToken(token);
  } catch (error) {
    return NextResponse.json({ success: false,user:"Invalid token" }, { status: 401 });
  }

  if (!db) {
    db = await open({
      filename: "./collection.db",
      driver: sqlite3.Database,
    });
  }
    const str = `
    INSERT INTO transactions (type, category, description, date, amount ) VALUES
     (?, ? ,? ,?, ?)
    `;
  //  console.log(body.type, body.category, body.description, body.date, body.amount);
    const result = await db.run(str, [body.type, body.category, body.description, body.date, body.amount])
    console.log("Inserted data into transactions table.");
    console.log('Inserted row with ID:', result.lastID);
    const strr = `
    INSERT INTO users_transcation_link (userid, transid ) VALUES
     (?, ?)
    `;
    const result2 = await db.run(strr, [payload.id,result.lastID])

  return NextResponse.json({ success: true, user:"success" }, { status: 200, headers: { "content-type": "application/json" } });
}
