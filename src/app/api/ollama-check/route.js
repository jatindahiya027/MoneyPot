// Checks Ollama connectivity and lists available models
export async function GET(req) {
  const url = req.headers.get("X-Ollama-Url") || "http://localhost:11434";
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return new Response(JSON.stringify({ ok: false, error: `HTTP ${res.status}` }), { status: 200, headers: { "Content-Type": "application/json" } });
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    return new Response(JSON.stringify({ ok: true, models }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: `Cannot connect to Ollama at ${url}` }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
}
