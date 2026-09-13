import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { analyzeFinances } from "@/lib/financialAnalysis";

export async function GET(request) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  const payload = token ? await verifyJwtToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requested = new URL(request.url).searchParams.get("months");
  const months = requested === "all" ? "all" : Math.min(6, Math.max(1, Number(requested) || 3));
  const db = await getDb();
  const [transactions, goals] = await Promise.all([
    db.all(`SELECT t.* FROM transactions t JOIN users_transcation_link l ON l.transid=t.transid WHERE l.userid=? ORDER BY t.date`, [payload.id]),
    db.all("SELECT * FROM savings_goals WHERE userid=? ORDER BY created_at DESC", [payload.id]),
  ]);
  return NextResponse.json({ ...analyzeFinances(transactions, months), goals });
}
