// Sliding-window rate limiter.
//
// Default: in-memory Map — zero dependencies, zero cost, fine for a single
// server instance. If you deploy across multiple instances/regions (needed
// once you're at real scale), set UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN (Upstash has a free tier) and this automatically
// switches to a shared, distributed limiter so limits are enforced
// consistently across every instance.

interface RateLimitEntry {
  count: number;
  start: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (now - entry.start > entry.windowMs) memoryStore.delete(key);
  }
}, 60_000).unref?.();

async function memoryRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now - entry.start > windowMs) {
    memoryStore.set(key, { count: 1, start: now, windowMs });
    return { success: true, remaining: limit - 1 };
  }
  entry.count += 1;
  const success = entry.count <= limit;
  return { success, remaining: Math.max(0, limit - entry.count) };
}

let upstash: { url: string; token: string } | false | null = null;
function getUpstash(): { url: string; token: string } | false {
  if (upstash !== null) return upstash;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  upstash = url && token ? { url, token } : false;
  return upstash;
}

async function upstashRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const { url, token } = getUpstash() as { url: string; token: string };
  const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, windowMs],
    ]),
  });
  const [incrResult] = (await res.json()) as [{ result: number }];
  const count = incrResult.result;
  return { success: count <= limit, remaining: Math.max(0, limit - count) };
}

/**
 * @param key unique bucket, e.g. `submit:${ip}`
 * @param limit max requests allowed in the window
 * @param windowMs window size in ms
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    if (getUpstash()) return await upstashRateLimit(key, limit, windowMs);
  } catch {
    // Fall through to in-memory if Upstash is briefly unreachable.
  }
  return memoryRateLimit(key, limit, windowMs);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
