import { NextResponse } from "next/server";
import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";
import { normalizeOllamaModel, normalizeOllamaOrigin } from "@/libs/ollama";

async function auth(req) {
  const token = req.headers.get("Authorization")?.split(" ")[1];
  return token ? verifyJwtToken(token) : null;
}

export async function POST(req) {
  const payload = await auth(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  const current = await db.get(
    "SELECT default_bank,banks,ollama_url,ollama_model FROM user_preferences WHERE userid=?",
    [payload.id]
  ) || { default_bank: "", banks: "[]", ollama_url: "http://127.0.0.1:11434", ollama_model: "llama3.2" };

  let currentBanks;
  try { currentBanks = JSON.parse(current.banks || "[]"); } catch { currentBanks = []; }
  const requestedBanks = Object.hasOwn(body, "banks") ? body.banks : currentBanks;
  const banks = [...new Set((Array.isArray(requestedBanks) ? requestedBanks : [])
    .map(value => String(value).trim().slice(0, 80)).filter(Boolean))].slice(0, 20);
  const requestedDefault = Object.hasOwn(body, "default_bank") ? String(body.default_bank || "") : current.default_bank;
  const defaultBank = banks.includes(requestedDefault) ? requestedDefault : (banks[0] || "");

  let ollamaUrl;
  let ollamaModel;
  try {
    ollamaUrl = Object.hasOwn(body, "ollama_url")
      ? normalizeOllamaOrigin(body.ollama_url)
      : normalizeOllamaOrigin(current.ollama_url);
    ollamaModel = Object.hasOwn(body, "ollama_model")
      ? normalizeOllamaModel(body.ollama_model)
      : normalizeOllamaModel(current.ollama_model);

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  const serializedBanks = JSON.stringify(banks);
  await db.run(`
    INSERT INTO user_preferences(userid,default_bank,banks,ollama_url,ollama_model,updated_at)
    VALUES(?,?,?,?,?,datetime('now'))
    ON CONFLICT(userid) DO UPDATE SET
      default_bank=excluded.default_bank,
      banks=excluded.banks,
      ollama_url=excluded.ollama_url,
      ollama_model=excluded.ollama_model,
      updated_at=datetime('now')
  `, [payload.id, defaultBank, serializedBanks, ollamaUrl, ollamaModel]);
  return NextResponse.json({
    success: true,
    preferences: { default_bank: defaultBank, banks: serializedBanks, ollama_url: ollamaUrl, ollama_model: ollamaModel },
  });
}
