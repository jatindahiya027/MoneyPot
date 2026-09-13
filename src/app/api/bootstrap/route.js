import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { summarizeTransactions } from "@/lib/finance";

async function auth(req) {
  const token = req.headers.get("Authorization")?.split(" ")[1];
  return token ? verifyJwtToken(token) : null;
}

export async function GET(req) {
  const payload = await auth(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const [user, transactions, categories, preferences] = await Promise.all([
    db.all("SELECT userid,name,age,mail,image FROM users WHERE userid=?", [payload.id]),
    db.all(`SELECT DISTINCT t.* FROM transactions t JOIN users_transcation_link l ON l.transid=t.transid WHERE l.userid=? ORDER BY t.date DESC,t.transid DESC`, [payload.id]),
    db.all(`SELECT c.* FROM categories c JOIN users_category_link l ON c.categoryid=l.categorykid WHERE l.userid=? ORDER BY c.type,c.name`, [payload.id]),
    db.get("SELECT default_bank,banks,ollama_url,ollama_model FROM user_preferences WHERE userid=?", [payload.id]).catch(() => null),
  ]);
  const fills = Object.fromEntries(categories.flatMap(c => [
    [`${c.type}\u0000${c.name}`, c.fill],
    [c.name, c.fill],
  ]));
  const summaries = summarizeTransactions(transactions, fills);
  return NextResponse.json({
    user,
    transactions,
    categories,
    preferences: preferences || {
      default_bank: "",
      banks: "[]",
      ollama_url: "http://127.0.0.1:11434",
      ollama_model: "llama3.2",
    },
    ...summaries,
  });
}

export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { StartDate = "", EndDate = "2099-12-31" } = await req.json();
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(StartDate) ? StartDate : "";
  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(EndDate) ? EndDate : "2099-12-31";
  const db = await getDb();
  const [transactions, categories] = await Promise.all([
    db.all(`SELECT t.* FROM transactions t JOIN users_transcation_link l ON l.transid=t.transid WHERE l.userid=? AND t.date BETWEEN ? AND ?`, [payload.id, startDate, endDate]),
    db.all(`SELECT c.* FROM categories c JOIN users_category_link l ON c.categoryid=l.categorykid WHERE l.userid=?`, [payload.id]),
  ]);
  const fills = Object.fromEntries(categories.flatMap(c => [
    [`${c.type}\u0000${c.name}`, c.fill],
    [c.name, c.fill],
  ]));
  return NextResponse.json(summarizeTransactions(transactions, fills, startDate, endDate));
}
