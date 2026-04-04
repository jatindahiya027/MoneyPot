import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const token = h.split(" ")[1];
  return token ? await verifyJwtToken(token) : null;
}

const UNAUTH = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// GET — list all recurring for user
export async function GET(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const db = await getDb();
  const rows = await db.all(
    "SELECT * FROM recurring WHERE userid=? ORDER BY next_date ASC",
    [payload.id]
  );
  return NextResponse.json(rows);
}

// POST — create a new recurring transaction
export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const body = await req.json();
  const { name, type, category, description, amount, frequency, next_date } = body;

  if (!name || !type || !category || !amount || !frequency || !next_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["Debit","Credit"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  const validFrequencies = ["daily","weekly","monthly","yearly"];
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO recurring (userid, name, type, category, description, amount, frequency, next_date, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [payload.id, name, type, category, description || "", amt, frequency, next_date]
  );

  return NextResponse.json({ success: true, recurid: result.lastID });
}

// PUT — toggle active or update next_date
export async function PUT(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const body = await req.json();
  const { recurid, active, next_date } = body;

  const db = await getDb();

  // Verify ownership
  const row = await db.get("SELECT recurid FROM recurring WHERE recurid=? AND userid=?", [recurid, payload.id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (active !== undefined) {
    await db.run("UPDATE recurring SET active=? WHERE recurid=?", [active ? 1 : 0, recurid]);
  }
  if (next_date) {
    await db.run("UPDATE recurring SET next_date=? WHERE recurid=?", [next_date, recurid]);
  }

  return NextResponse.json({ success: true });
}

// DELETE — remove a recurring entry
export async function DELETE(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;

  const { recurid } = await req.json();
  const db = await getDb();

  const row = await db.get("SELECT recurid FROM recurring WHERE recurid=? AND userid=?", [recurid, payload.id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.run("DELETE FROM recurring WHERE recurid=?", [recurid]);
  return NextResponse.json({ success: true });
}
