import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const t = h.split(" ")[1];
  return t ? await verifyJwtToken(t) : null;
}

const UNAUTH = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function GET(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;
  const db = await getDb();
  const goals = await db.all(
    "SELECT * FROM savings_goals WHERE userid=? ORDER BY created_at DESC",
    [payload.id]
  );
  return NextResponse.json(goals);
}

export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;
  const { name, target_amount, deadline, color } = await req.json();
  if (!name || !target_amount) return NextResponse.json({ error: "name and target_amount required" }, { status: 400 });
  const amt = parseFloat(target_amount);
  if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const db = await getDb();
  const result = await db.run(
    `INSERT INTO savings_goals (userid, name, target_amount, saved_amount, deadline, color, created_at)
     VALUES (?, ?, ?, 0, ?, ?, datetime('now'))`,
    [payload.id, name.trim().slice(0, 100), amt, deadline || null, color || "#22c55e"]
  );
  return NextResponse.json({ success: true, goalid: result.lastID });
}

export async function PUT(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;
  const { goalid, saved_amount, name, target_amount, deadline, color } = await req.json();
  if (!goalid) return NextResponse.json({ error: "goalid required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.get(
    "SELECT goalid FROM savings_goals WHERE goalid=? AND userid=?",
    [goalid, payload.id]
  );
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates = [];
  const vals = [];
  if (saved_amount !== undefined) { updates.push("saved_amount=?"); vals.push(parseFloat(saved_amount)); }
  if (name)          { updates.push("name=?");          vals.push(name.trim().slice(0,100)); }
  if (target_amount) { updates.push("target_amount=?"); vals.push(parseFloat(target_amount)); }
  if (deadline !== undefined) { updates.push("deadline=?"); vals.push(deadline || null); }
  if (color)         { updates.push("color=?");         vals.push(color); }

  if (updates.length > 0) {
    vals.push(goalid);
    await db.run(`UPDATE savings_goals SET ${updates.join(",")} WHERE goalid=?`, vals);
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req) {
  const payload = await auth(req);
  if (!payload) return UNAUTH;
  const { goalid } = await req.json();
  const db = await getDb();
  const existing = await db.get(
    "SELECT goalid FROM savings_goals WHERE goalid=? AND userid=?",
    [goalid, payload.id]
  );
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.run("DELETE FROM savings_goals WHERE goalid=?", [goalid]);
  return NextResponse.json({ success: true });
}
