const COOKIE_NAME = "lep_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function textBytes(value) {
  return new TextEncoder().encode(value);
}

export async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(data));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let next = 0;
  for (let index = 0; index < left.length; index += 1) {
    next |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return next === 0;
}

export async function accessCodesMatch(secret, provided, expected) {
  const [left, right] = await Promise.all([
    hmacHex(secret, provided),
    hmacHex(secret, expected),
  ]);
  return timingSafeEqual(left, right);
}

export async function createSessionToken(secret, now = Date.now()) {
  const payload = String(now + MAX_AGE_SECONDS * 1000);
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(secret, token, now = Date.now()) {
  if (!token) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  const expected = await hmacHex(secret, payload);
  return timingSafeEqual(signature, expected);
}

export function readCookie(header, name = COOKIE_NAME) {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    if (trimmed.slice(0, separator) !== name) continue;
    return trimmed.slice(separator + 1);
  }
  return null;
}

export function sessionCookieHeader(token, secure) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...extraHeaders,
    },
  });
}

export async function hasValidSession(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return false;
  const token = readCookie(request.headers.get("Cookie"));
  return verifySessionToken(secret, token);
}
