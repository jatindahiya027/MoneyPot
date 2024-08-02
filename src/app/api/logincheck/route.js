import sqlite3 from "sqlite3";
import { open } from "sqlite";
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
items = "logged in, redirecting user to dashboard";
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
