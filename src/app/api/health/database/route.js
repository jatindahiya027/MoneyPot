import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";

export async function GET() {
  try {
    const db = await getDb();
    const required = ["users", "categories", "transactions", "user_preferences"];
    const rows = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?,?,?)", required);
    const present = new Set(rows.map(row => row.name));
    const missing = required.filter(name => !present.has(name));
    if (missing.length) return NextResponse.json({ ok:false, error:`Missing database tables: ${missing.join(", ")}` }, { status:500 });
    return NextResponse.json({ ok:true });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error.message }, { status:500 });
  }
}
