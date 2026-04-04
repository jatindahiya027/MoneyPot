import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

function toISODate(raw) {
  if (!raw) return raw;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,a,b] = s.split("-").map(Number);
    if (a > 12) return `${String(y).padStart(4,"0")}-${String(b).padStart(2,"0")}-${String(a).padStart(2,"0")}`;
    return s;
  }
  const dmy4 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy4) { const [,d,m,y] = dmy4; return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return s;
}

export async function POST(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false }, { status: 401 });
  const token = authHeader.split(" ")[1];
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  const payload = await verifyJwtToken(token);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount < 0) return NextResponse.json({ success: false }, { status: 400 });
  if (!["Debit","Credit"].includes(body.type)) return NextResponse.json({ success: false }, { status: 400 });
  const safeDate = toISODate(body.date);

  const db = await getDb();

  // Verify the transaction belongs to this user before updating
  const link = await db.get(
    "SELECT 1 FROM users_transcation_link WHERE userid=? AND transid=?",
    [payload.id, body.id]
  );
  if (!link) return NextResponse.json({ success: false, user: "Not found" }, { status: 404 });

  const bank = String(body.bank_name || "").trim().slice(0, 80);
  await db.run(
    "UPDATE transactions SET type=?, category=?, description=?, date=?, amount=?, bank_name=? WHERE transid=?",
    [body.type, body.category, body.description || "", safeDate, amount, bank, body.id]
  );

  return NextResponse.json({ success: true }, { status: 200 });
}
