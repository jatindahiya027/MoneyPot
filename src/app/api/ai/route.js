import { getDb } from "@/libs/db";
import { verifyJwtToken } from "@/libs/auth";

async function authenticate(req) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try { return await verifyJwtToken(token); } catch { return null; }
}

// Compress transactions to minimal token footprint
function compressTransactions(rows) {
  // Only keep fields the LLM needs
  return rows.map(r => ({
    d: r.date,
    t: r.type === "Credit" ? "C" : "D",
    c: r.category,
    a: Number(r.amount),
    ...(r.description ? { n: r.description.slice(0, 30) } : {}),
  }));
}

// Summarise compressed data as a compact text block instead of raw JSON
function buildPrompt(rows) {
  const credits = rows.filter(r => r.t === "C");
  const debits  = rows.filter(r => r.t === "D");
  const totalIn  = credits.reduce((s, r) => s + r.a, 0);
  const totalOut = debits.reduce((s, r) => s + r.a, 0);

  // Category breakdown
  const catMap = {};
  debits.forEach(r => { catMap[r.c] = (catMap[r.c] || 0) + r.a; });
  const catLines = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([c, a]) => `  ${c}: ₹${a}`)
    .join("\n");

  // Recent 20 transactions as minimal CSV
  const recent = rows.slice(-20)
    .map(r => `${r.d},${r.t === "C" ? "+" : "-"}${r.a},${r.c}`)
    .join("\n");

  return `You are a personal finance assistant. Analyze this data and give a concise, actionable summary (max 200 words, 3 sections).

Period: last 3 months
Total income: ₹${totalIn}
Total expenses: ₹${totalOut}
Net: ₹${totalIn - totalOut}
Transactions: ${rows.length}

Top expense categories:
${catLines || "  (none)"}

Recent transactions (date,+/-amount,category):
${recent || "  (none)"}

Give: 1) spending pattern, 2) biggest concern, 3) one tip.`;
}

export async function GET(req) {
  const payload = await authenticate(req);
  if (!payload) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

  // Read Ollama settings from request headers (passed by client)
  const ollamaUrl   = req.headers.get("X-Ollama-Url")   || "http://localhost:11434";
  const ollamaModel = req.headers.get("X-Ollama-Model")  || "llama3.2";

  const db = await getDb();

  // Only last 3 months to limit token usage
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const cutoff = threeMonthsAgo.toISOString().slice(0, 10);

  const rows = await db.all(
    `SELECT t.date, t.type, t.category, t.amount, t.description
     FROM transactions t
     JOIN users_transcation_link l ON t.transid = l.transid
     WHERE l.userid = ? AND t.date >= ?
     ORDER BY t.date ASC`,
    [payload.id, cutoff]
  );

  const prompt = buildPrompt(compressTransactions(rows));

  // Call Ollama /api/chat (works with all models, streaming disabled)
  let ollamaRes;
  try {
    ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { num_predict: 600 }, // ~450 words max
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Cannot reach Ollama at ${ollamaUrl}. Is it running?` }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  if (!ollamaRes.ok) {
    const body = await ollamaRes.text().catch(() => "");
    return new Response(JSON.stringify({ error: `Ollama error ${ollamaRes.status}: ${body}` }), { status: ollamaRes.status, headers: { "Content-Type": "application/json" } });
  }

  let data;
  const rawText = await ollamaRes.text();
  try { data = JSON.parse(rawText); } catch {
    return new Response(JSON.stringify({ error: "Ollama returned non-JSON: " + rawText.slice(0, 200) }), { status: 502, headers: { "Content-Type": "application/json" } });
  }

  // Ollama /api/chat returns { message: { content: "..." } }
  // Ollama /api/generate returns { response: "..." }
  const text = data?.message?.content ?? data?.response ?? "";

  if (!text.trim()) {
    // Log full data server-side to help debug
    console.error("[ai/route] Empty text from Ollama. Full response:", JSON.stringify(data).slice(0, 500));
    return new Response(JSON.stringify({ error: `Model returned empty response. Model used: ${ollamaModel}. Rows fetched: ${rows.length}. Check server logs.` }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify(text), { headers: { "Content-Type": "application/json" }, status: 200 });
}
