const buckets = new Map();
const MAX_BUCKETS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;
let lastSweepAt = 0;

function sweepExpired(now) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS && buckets.size < MAX_BUCKETS) return;
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    buckets.delete(buckets.keys().next().value);
  }
  lastSweepAt = now;
}

export function requestIdentity(request) {
  if (process.env.TRUST_PROXY !== "1") return "local";
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  sweepExpired(now);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count <= limit) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}
