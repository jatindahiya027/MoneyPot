import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
import { normalizeTransactionInput, preservesExistingTransactionCategory, userHasCategory } from "@/libs/transactionValidation";

export async function POST(req) {
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

  // Verify the transaction belongs to this user before updating
  const current = await db.get(
    `SELECT t.type,t.category
     FROM transactions t
     JOIN users_transcation_link l ON l.transid=t.transid
     WHERE l.userid=? AND t.transid=?`,
    [payload.id, body.id]
  );
  if (!current) return NextResponse.json({ success: false, user: "Not found" }, { status: 404 });

  const preservesExistingCategory = preservesExistingTransactionCategory(current, transaction);
  if (!preservesExistingCategory && !(await userHasCategory(db, payload.id, transaction.type, transaction.category))) {
    return NextResponse.json({ success: false, user: "Choose a category available for this transaction type." }, { status: 400 });
  }

  const links = await db.get(
    "SELECT COUNT(*) AS count FROM users_transcation_link WHERE transid=?",
    [body.id]
  );
  await db.exec("BEGIN IMMEDIATE");
  try {
    if (Number(links?.count) > 1) {
      const result = await db.run(
        `INSERT INTO transactions(type,category,description,date,amount,bank_name)
         VALUES(?,?,?,?,?,?)`,
        [transaction.type, transaction.category, transaction.description, transaction.date, transaction.amount, transaction.bank_name]
      );
      await db.run(
        "UPDATE users_transcation_link SET transid=? WHERE userid=? AND transid=?",
        [result.lastID, payload.id, body.id]
      );
    } else {
      await db.run(
        "UPDATE transactions SET type=?, category=?, description=?, date=?, amount=?, bank_name=? WHERE transid=?",
        [transaction.type, transaction.category, transaction.description, transaction.date, transaction.amount, transaction.bank_name, body.id]
      );
    }
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK").catch(() => {});
    throw error;
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
