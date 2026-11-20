import type { SessionEnv } from "./auth";

const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 5;
const KEY_PREFIX = "login:";

interface FailureRecord {
  count: number;
  resetAt: number;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("CF-Connecting-IP")?.trim();
  return forwarded && forwarded.length > 0 ? forwarded.slice(0, 128) : "unknown";
}

function storageKey(ip: string): string {
  return KEY_PREFIX + ip.replace(/[^A-Za-z0-9:._-]/g, "_");
}

function parseRecord(raw: string | null, now: number): FailureRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FailureRecord;
    if (!Number.isFinite(parsed.count) || !Number.isFinite(parsed.resetAt)) return null;
    if (parsed.resetAt <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function isLoginRateLimited(
  env: Pick<SessionEnv, "LOGIN_RL">,
  ip: string,
  now = Date.now(),
): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  if (!env.LOGIN_RL) return { limited: false, retryAfterSeconds: 0 };
  const record = parseRecord(await env.LOGIN_RL.get(storageKey(ip)), now);
  if (!record || record.count < MAX_FAILURES) {
    return { limited: false, retryAfterSeconds: 0 };
  }
  return {
    limited: true,
    retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}

export async function recordLoginFailure(
  env: Pick<SessionEnv, "LOGIN_RL">,
  ip: string,
  now = Date.now(),
): Promise<void> {
  if (!env.LOGIN_RL) return;
  const key = storageKey(ip);
  const existing = parseRecord(await env.LOGIN_RL.get(key), now);
  const resetAt = existing?.resetAt ?? now + WINDOW_SECONDS * 1000;
  const count = (existing?.count ?? 0) + 1;
  const ttl = Math.max(60, Math.ceil((resetAt - now) / 1000));
  await env.LOGIN_RL.put(key, JSON.stringify({ count, resetAt }), { expirationTtl: ttl });
}

export async function clearLoginFailures(
  env: Pick<SessionEnv, "LOGIN_RL">,
  ip: string,
): Promise<void> {
  if (!env.LOGIN_RL) return;
  await env.LOGIN_RL.delete(storageKey(ip));
}
