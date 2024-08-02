
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { verifyJwtToken } from "@/libs/auth";
// Initialize the database instance as null initially
import Groq from "groq-sdk";
let db = null;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export async function getGroqChatCompletion(table) {
  const contents = "Give the financial data of a person give me summary: " + table;
  // const contents = "Give me financial insight of a person from the given data: ";
  return groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: contents,
      },
    ],
    model: "gemma2-9b-it",
  });
}
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
  if (!db) {
    // If the database instance is not initialized, open the database connection
    db = await open({
      filename: "./collection.db", // Specify the database file path
      driver: sqlite3.Database, // Specify the database driver (sqlite3 in this case)
    });
  }
   const id = payload?payload.id:"no data";
   const str = "SELECT t.* FROM transactions t JOIN users_transcation_link l ON t.transid = l.transid WHERE l.userid='"+id+"'";

  const table = await db.all(str);
  let items = await getGroqChatCompletion(JSON.stringify(table));
  items = items.choices[0]?.message?.content || "";

  // Return the items as a JSON response with status 200
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
