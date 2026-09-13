import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";
import { ensureUserCategory, fallbackCategory } from "@/libs/categoryIntegrity.mjs";

async function auth(req) {
  const h = req.headers.get("Authorization");
  if (!h) return null;
  const t = h.split(" ")[1];
  return t ? await verifyJwtToken(t) : null;
}

export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ success: false }, { status: 400 });

  const db = await getDb();

  // Verify this category belongs to the user before deleting
  const link = await db.get(
    "SELECT 1 FROM users_category_link WHERE userid=? AND categorykid=?",
    [payload.id, id]
  );
  if (!link) return NextResponse.json({ success: false }, { status: 404 });

  const cat = await db.get("SELECT name,type FROM categories WHERE categoryid=?", [id]);
  if (!cat) return NextResponse.json({ success: false }, { status: 404 });
  if (cat.name.toLowerCase() === fallbackCategory(cat.type).toLowerCase()) {
    return NextResponse.json({ success: false, user: "Miscellaneous is required as the fallback category." }, { status: 400 });
  }

  await db.exec("BEGIN IMMEDIATE");
  try {
    const fallback = fallbackCategory(cat.type);
    await ensureUserCategory(db, payload.id, cat.type, fallback);
    const transactions = await db.all(`
      SELECT t.*,
        (SELECT COUNT(*) FROM users_transcation_link other WHERE other.transid=t.transid) AS link_count
      FROM transactions t
      JOIN users_transcation_link l ON l.transid=t.transid
      WHERE l.userid=? AND lower(t.category)=lower(?) AND t.type=?
    `, [payload.id, cat.name, cat.type]);
    for (const transaction of transactions) {
      if (Number(transaction.link_count) > 1) {
        const result = await db.run(
          `INSERT INTO transactions(type,category,description,date,amount,bank_name)
           VALUES(?,?,?,?,?,?)`,
          [transaction.type, fallback, transaction.description, transaction.date, transaction.amount, transaction.bank_name]
        );
        await db.run(
          "UPDATE users_transcation_link SET transid=? WHERE userid=? AND transid=?",
          [result.lastID, payload.id, transaction.transid]
        );
      } else {
        await db.run("UPDATE transactions SET category=? WHERE transid=?", [fallback, transaction.transid]);
      }
    }
    await db.run(
      "DELETE FROM users_category_link WHERE userid=? AND categorykid=?",
      [payload.id, id]
    );
    const remainingLinks = await db.get(
      "SELECT COUNT(*) AS count FROM users_category_link WHERE categorykid=?",
      [id]
    );
    if (!remainingLinks.count) await db.run("DELETE FROM categories WHERE categoryid=?", [id]);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }

  return NextResponse.json({ success: true });
}
