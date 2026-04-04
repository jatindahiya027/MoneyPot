import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

function toISODate(raw) {
  if (!raw) return raw;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, a, b] = s.split("-").map(Number);
    if (a > 12) return `${String(y).padStart(4,"0")}-${String(b).padStart(2,"0")}-${String(a).padStart(2,"0")}`;
    return s;
  }
  const dmy4 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy4) { const [,d,m,y] = dmy4; return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  const dmy2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmy2) { const [,d,m,yy] = dmy2; const y = parseInt(yy)>=50?`19${yy}`:`20${yy}`; return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const dmy3 = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})$/);
  if (dmy3) { const mo = months[dmy3[2].toLowerCase()]; if (mo) return `${dmy3[3]}-${String(mo).padStart(2,"0")}-${dmy3[1].padStart(2,"0")}`; }
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return s;
}

export async function POST(req) {
  // Fix: payload is local — no module-level mutation
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ success: false }, { status: 401 });
  const token = authHeader.split(" ")[1];
  if (!token) return NextResponse.json({ success: false }, { status: 401 });

  const payload = await verifyJwtToken(token);
  if (!payload) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();

  // Input validation
  const amount = parseFloat(body.amount);
  if (isNaN(amount) || amount < 0) return NextResponse.json({ success: false, user: "Invalid amount" }, { status: 400 });
  if (!["Debit","Credit"].includes(body.type)) return NextResponse.json({ success: false, user: "Invalid type" }, { status: 400 });
  const safeDate = toISODate(body.date);
  if (!safeDate) return NextResponse.json({ success: false, user: "Invalid date" }, { status: 400 });

  const bank = String(body.bank_name || "").trim().slice(0, 80);
  const db = await getDb();
  const result = await db.run(
    "INSERT INTO transactions (type, category, description, date, amount, bank_name) VALUES (?, ?, ?, ?, ?, ?)",
    [body.type, body.category, body.description || "", safeDate, amount, bank]
  );
  await db.run(
    "INSERT INTO users_transcation_link (userid, transid) VALUES (?, ?)",
    [payload.id, result.lastID]
  );

  return NextResponse.json({ success: true }, { status: 200 });
}
