import { parse } from 'json2csv';
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { verifyJwtToken } from "@/libs/auth";
// Initialize the database instance as null initially
let db = null;
let payload= null;
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
//  //console.log(payload);
  if (!db) {
    // If the database instance is not initialized, open the database connection
    db = await open({
      filename: "./collection.db", // Specify the database file path
      driver: sqlite3.Database, // Specify the database driver (sqlite3 in this case)
    });
  }
  const userId = payload.id;
  const str = "SELECT t.* FROM transactions t JOIN users_transcation_link l ON t.transid = l.transid WHERE l.userid = ? ORDER BY t.date DESC";
  let items = await db.all(str, [userId]);
  try {
    // Convert the JSON array to CSV
    if (items.length === 0) {
      //console.log('No data found');
      items = [{"Data" : "No Data Found"}];
    } else {
      //console.log('Data found:', items);
    }
    const csv = parse(items);

    // Return the CSV as a downloadable file
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=transactions.csv"
      },
      status: 200,
    });
  } catch (err) {
    console.error('Error converting JSON to CSV:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
