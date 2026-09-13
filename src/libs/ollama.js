export const DEFAULT_OLLAMA_ORIGIN = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

function configuredOrigins() {
  return new Set([
    DEFAULT_OLLAMA_ORIGIN,
    "http://localhost:11434",
    ...(process.env.OLLAMA_ALLOWED_ORIGINS || "")
      .split(",")
      .map(value => value.trim())
      .filter(Boolean),
  ]);
}

export function normalizeOllamaOrigin(raw = DEFAULT_OLLAMA_ORIGIN) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    throw new Error("Invalid Ollama URL.");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Ollama URL must be an origin without credentials, paths, or query parameters.");
  }
  if (!configuredOrigins().has(url.origin)) {
    throw new Error("This Ollama origin is not allowed. Configure OLLAMA_ALLOWED_ORIGINS to add it.");
  }
  return url.origin;
}

export function normalizeOllamaModel(raw = DEFAULT_OLLAMA_MODEL) {
  const model = String(raw).trim();
  if (!/^[A-Za-z0-9._:/-]{1,100}$/.test(model)) throw new Error("Invalid Ollama model name.");
  return model;
}

export function getOllamaOrigin(request) {
  return normalizeOllamaOrigin(request.headers.get("X-Ollama-Url") || DEFAULT_OLLAMA_ORIGIN);
}

export function getOllamaModel(request) {
  return normalizeOllamaModel(request.headers.get("X-Ollama-Model") || DEFAULT_OLLAMA_MODEL);
}

function parameterBillions(model) {
  const raw = String(model?.details?.parameter_size || model?.name || "");
  const match = raw.match(/(?:^|[:_-])(\d+(?:\.\d+)?)\s*([bm])(?:$|[^a-z])/i)
    || raw.match(/(\d+(?:\.\d+)?)\s*([bm])/i);
  if (!match) return null;
  const value = Number(match[1]);
  return match[2].toLowerCase() === "m" ? value / 1000 : value;
}

function modelScore(model) {
  const name = model.name.toLowerCase();
  if (/(^|[-_:])(embed|embedding|rerank|clip)([-_:]|$)/.test(name) || /nomic-embed|mxbai-embed|snowflake-arctic-embed/.test(name)) {
    return -10_000;
  }

  let score = 0;
  const families = [
    [/qwen3/, 950], [/llama3\.3/, 925], [/gemma3/, 900], [/qwen2\.5/, 875],
    [/llama3\.2/, 850], [/phi4/, 825], [/mistral|mixtral/, 800], [/deepseek-r1/, 760],
  ];
  for (const [pattern, value] of families) {
    if (pattern.test(name)) { score += value; break; }
  }
  if (/instruct|chat/.test(name)) score += 100;
  if (/vision|llava|minicpm-v/.test(name)) score -= 250;

  const billions = parameterBillions(model);
  if (billions !== null) {
    if (billions >= 3 && billions <= 14) score += 260;
    else if (billions > 14 && billions <= 32) score += 160;
    else if (billions > 32) score += 40;
    else score += 90;
  }
  return score;
}

export function normalizeOllamaModels(models = []) {
  const byName = new Map();
  for (const raw of Array.isArray(models) ? models : []) {
    const name = String(typeof raw === "string" ? raw : raw?.name || "").trim();
    if (!name || byName.has(name)) continue;
    const details = typeof raw === "object" && raw?.details ? raw.details : {};
    byName.set(name, {
      name,
      size: Number(typeof raw === "object" ? raw?.size : 0) || 0,
      modified_at: typeof raw === "object" ? String(raw?.modified_at || "") : "",
      details: {
        family: String(details.family || ""),
        parameter_size: String(details.parameter_size || ""),
        quantization_level: String(details.quantization_level || ""),
      },
    });
  }
  return [...byName.values()];
}

export function selectOllamaModel(models, preferred = "") {
  const normalized = normalizeOllamaModels(models);
  const preferredName = String(preferred || "").trim();
  const preferredModel = normalized.find(model => model.name === preferredName && modelScore(model) > -10_000);
  const ranked = normalized
    .filter(model => modelScore(model) > -10_000)
    .sort((a, b) => modelScore(b) - modelScore(a)
      || Date.parse(b.modified_at || 0) - Date.parse(a.modified_at || 0)
      || a.name.localeCompare(b.name));
  const recommended = ranked[0]?.name || "";
  return {
    selected: preferredModel?.name || recommended,
    recommended,
    preferredAvailable: Boolean(preferredModel),
    models: normalized,
  };
}

export async function findOllamaModels(origin, { timeout = 5000 } = {}) {
  const url = normalizeOllamaOrigin(origin);
  const response = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  return normalizeOllamaModels(data.models);
}
