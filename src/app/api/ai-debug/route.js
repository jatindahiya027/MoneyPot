// Dev-only debug endpoint — no auth required, shows full AI pipeline state
import { getDb } from "@/libs/db";

export async function GET(req) {
  const ollamaUrl   = req.headers.get("X-Ollama-Url")   || "http://localhost:11434";
  const ollamaModel = req.headers.get("X-Ollama-Model")  || "llama3.2";

  // DB check — get first user's transaction count as sanity check
  let dbInfo = {};
  try {
    const db = await getDb();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const cutoff = threeMonthsAgo.toISOString().slice(0, 10);
    const allUsers = await db.all("SELECT userid FROM users LIMIT 5");
    // For each user show row count
    const perUser = [];
    for (const u of allUsers) {
      const rows = await db.all(
        `SELECT COUNT(*) as cnt FROM transactions t
         JOIN users_transcation_link l ON t.transid = l.transid
         WHERE l.userid = ? AND t.date >= ?`,
        [u.userid, cutoff]
      );
      perUser.push({ userid: u.userid, rowsLast3Months: rows[0]?.cnt });
    }
    dbInfo = { cutoff, usersFound: allUsers.length, perUser };
  } catch (e) {
    dbInfo = { error: String(e) };
  }

  // Ollama connectivity
  let ollamaConnectivity = {};
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    ollamaConnectivity = { reachable: true, models: (data.models || []).map(m => m.name) };
  } catch (e) {
    ollamaConnectivity = { reachable: false, error: String(e) };
  }

  // Quick chat test
  let chatTest = {};
  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: "Reply with just the word: WORKING" }],
        stream: false,
        options: { num_predict: 10 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await res.text();
    chatTest = { httpStatus: res.status, rawResponse: raw.slice(0, 300) };
    try {
      const parsed = JSON.parse(raw);
      chatTest.messageContent = parsed?.message?.content;
      chatTest.response = parsed?.response;
    } catch { chatTest.parseError = "not valid JSON"; }
  } catch (e) {
    chatTest = { error: String(e) };
  }

  return new Response(JSON.stringify({
    ollamaUrl, ollamaModel,
    db: dbInfo,
    ollama: ollamaConnectivity,
    chat: chatTest,
  }, null, 2), { headers: { "Content-Type": "application/json" }, status: 200 });
}
