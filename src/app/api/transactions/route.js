import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { jwtVerify } from "jose";
import { getJwtSecretKey } from "@/libs/auth"; // Adjust the path based on your project structure
import { verifyJwtToken } from "@/libs/auth";
// Initialize the database instance as null initially
let db = null;
let payload = null;
// Define the GET request handler function
export async function GET(req, res) {
  // Extract the Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authorization header missing" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(" ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "Token missing" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    // Verify the JWT token
     payload = await verifyJwtToken(token);
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }
 
//  console.log("my name is: ",p.username);
  // Check if the database instance has been initialized
  if (!db) {
    // If the database instance is not initialized, open the database connection
    db = await open({
      filename: "./collection.db", // Specify the database file path
      driver: sqlite3.Database, // Specify the database driver (sqlite3 in this case)
    });
  }
  // console.log("hello");
   const str = "SELECT t.* FROM transactions t JOIN users_transcation_link l ON t.transid = l.transid WHERE l.userid='"+payload.id+"'";
  // const str = "SELECT * FROM users";
  // Perform a database query to retrieve all items from the "items" table
  const items = await db.all(str);

  // Return the items as a JSON response with status 200
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
