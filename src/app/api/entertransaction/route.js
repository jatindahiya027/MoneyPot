import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
import { normalizeTransactionInput, userHasCategory } from "@/libs/transactionValidation";

export async function POST(req) {
  // Fix: payload is local — no module-level mutation
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false }, { status: 401 });
  const token = authHeader.split(" ")[1];
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  const payload = await verifyJwtToken(token);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();

  const normalized = normalizeTransactionInput(body);
  if (normalized.error) return NextResponse.json({ success: false, user: normalized.error }, { status: 400 });
  const transaction = normalized.value;
  const db = await getDb();
  if (!(await userHasCategory(db, payload.id, transaction.type, transaction.category))) {
    return NextResponse.json({ success: false, user: "Choose a category available for this transaction type." }, { status: 400 });
  }
  await db.exec("BEGIN IMMEDIATE");
  try {
    const result = await db.run(
      "INSERT INTO transactions (type, category, description, date, amount, bank_name) VALUES (?, ?, ?, ?, ?, ?)",
      [transaction.type, transaction.category, transaction.description, transaction.date, transaction.amount, transaction.bank_name]
    );
    await db.run(
      "INSERT INTO users_transcation_link (userid, transid) VALUES (?, ?)",
      [payload.id, result.lastID]
    );
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK").catch(() => {});
    throw error;
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
