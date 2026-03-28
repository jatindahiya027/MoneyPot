import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { NextResponse } from "next/server";

let payload = null;

/**
 * Normalises any incoming date string to YYYY-MM-DD.
 * Handles: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY,
 *          DD MMM YYYY, YYYY-DD-MM (the broken legacy format), etc.
 * Returns the original string unchanged if nothing matches.
 */
function toISODate(raw) {
  if (!raw) return raw;
  const s = String(raw).trim();

  // Already correct ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, a, b] = s.split("-").map(Number);
    // Detect legacy YYYY-DD-MM: second segment > 12 means it must be a day
    if (a > 12) {
      return `${String(y).padStart(4,"0")}-${String(b).padStart(2,"0")}-${String(a).padStart(2,"0")}`;
    }
    return s;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (4-digit year)
  const dmy4 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy4) {
    const [, d, m, y] = dmy4;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  // DD/MM/YY or DD-MM-YY (2-digit year)
  const dmy2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmy2) {
    const [, d, m, yy] = dmy2;
    const y = parseInt(yy) >= 50 ? `19${yy}` : `20${yy}`;
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  // DD MMM YYYY  e.g. 25 Jan 2024
  const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const dmy3 = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})$/);
  if (dmy3) {
    const mo = months[dmy3[2].toLowerCase()];
    if (mo) return `${dmy3[3]}-${String(mo).padStart(2,"0")}-${dmy3[1].padStart(2,"0")}`;
  }

  // Fallback — let JS Date try (handles ISO-like strings)
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];

  return s; // return as-is if nothing matched
}

export async function POST(req, res) {
  const body = await req.json();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false, user: "authorization header missing" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return NextResponse.json({ success: false, user: "token missing" }, { status: 401 });
  }

  try {
    payload = await verifyJwtToken(token);
  } catch (error) {
    return NextResponse.json({ success: false, user: "Invalid token" }, { status: 401 });
  }

  const db = await getDb();

  // Always store date as YYYY-MM-DD regardless of what the client sends
  const safeDate = toISODate(body.date);

  const str = `
    INSERT INTO transactions (type, category, description, date, amount)
    VALUES (?, ?, ?, ?, ?)
  `;
  const result = await db.run(str, [body.type, body.category, body.description, safeDate, body.amount]);

  const strr = `
    INSERT INTO users_transcation_link (userid, transid)
    VALUES (?, ?)
  `;
  await db.run(strr, [payload.id, result.lastID]);

  return NextResponse.json({ success: true, user: "success" }, { status: 200 });
}