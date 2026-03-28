import { getDb } from "@/libs/db";
import { jwtVerify } from "jose";
import { getJwtSecretKey } from "@/libs/auth"; // Adjust the path based on your project structure
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
// Initialize the database instance as null initially
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

  const db = await getDb();
  const id = payload.id;
    const str = `
    UPDATE users SET name= ? , age = ?,  mail = ?,  image = ? WHERE userid = ?
    `;
  //  //console.log(body.type, body.category, body.description, body.date, body.amount);
    const result = await db.run(str, [body.name, body.age, body.mail, body.img,id])
    //console.log("Inserted data into users table.");
    
    

  return NextResponse.json({ success: true, user:"success" }, { status: 200, headers: { "content-type": "application/json" } });
}
