// Shared helpers for the Babu Banarasi server functions.

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://babubanarasi.com,https://www.babubanarasi.com,http://localhost:8765")
  .split(",").map((s) => s.trim()).filter(Boolean);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}

/** HMAC-SHA256 as lowercase hex (Razorpay's signature format). */
export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Simple per-visitor rate limit backed by the request_log table (migration 0002).
 * Returns true when the visitor has made `max` or more calls to `fn` in the last
 * `windowSec` seconds. Only a SHA-256 hash of the IP is stored. If the table is
 * missing or the database hiccups, it lets the request through rather than
 * blocking real customers from checking out.
 */
// deno-lint-ignore no-explicit-any
export async function rateLimited(admin: any, req: Request, fn: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";
    const salt = Deno.env.get("RATE_LIMIT_SALT") ?? "babubanarasi";
    const ipHash = await sha256Hex(`${salt}:${ip}`);
    const since = new Date(Date.now() - windowSec * 1000).toISOString();
    const { count, error } = await admin.from("request_log")
      .select("id", { count: "exact", head: true })
      .eq("fn", fn).eq("ip_hash", ipHash).gte("at", since);
    if (error) { console.error("Rate limit check failed", error.message); return false; }
    if ((count ?? 0) >= max) return true;
    await admin.from("request_log").insert({ ip_hash: ipHash, fn });
    return false;
  } catch (e) {
    console.error("Rate limit check failed", e);
    return false;
  }
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison, so signatures can't be guessed byte by byte. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
