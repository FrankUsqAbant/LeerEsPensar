import { applySecurityHeaders } from "./securityHeaders";

export const COOKIE_NAME = "lep_session";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface SessionEnv {
  ACCESS_CODE?: string;
  SESSION_SECRET?: string;
  SESSION_VERSION?: string;
  CF_PAGES?: string;
  BOOKS?: R2Bucket;
  LOGIN_RL?: KVNamespace;
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export async function hmacHex(secret: string, data: string): Promise<string> {
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

export function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let next = 0;
  for (let index = 0; index < left.length; index += 1) {
    next |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return next === 0;
}

export async function accessCodesMatch(
  secret: string,
  provided: string,
  expected: string,
): Promise<boolean> {
  const [left, right] = await Promise.all([
    hmacHex(secret, provided),
    hmacHex(secret, expected),
  ]);
  return timingSafeEqual(left, right);
}

export async function createSessionToken(
  secret: string,
  version: string,
  now = Date.now(),
): Promise<string> {
  const payload = `${now + MAX_AGE_SECONDS * 1000}:${version}`;
  const signature = await hmacHex(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  secret: string,
  version: string,
  token: string | null,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !version) return false;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const colon = payload.indexOf(":");
  if (colon <= 0) return false;
  const expiresAt = Number(payload.slice(0, colon));
  const tokenVersion = payload.slice(colon + 1);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return false;
  if (!timingSafeEqual(tokenVersion, version)) return false;
  const expected = await hmacHex(secret, payload);
  return timingSafeEqual(signature, expected);
}

export function readCookie(header: string | null, name = COOKIE_NAME): string | null {
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

export function shouldSecureCookie(request: Request, env: Pick<SessionEnv, "CF_PAGES">): boolean {
  return Boolean(env.CF_PAGES) || new URL(request.url).protocol === "https:";
}

function cookieParts(value: string, maxAge: number, secure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function sessionCookieHeader(token: string, secure: boolean): string {
  return cookieParts(token, MAX_AGE_SECONDS, secure);
}

export function clearSessionCookieHeader(secure: boolean): string {
  return cookieParts("", 0, secure);
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
  });
  new Headers(extraHeaders).forEach((value, key) => {
    headers.set(key, value);
  });
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(body), { status, headers });
}

export async function hasValidSession(request: Request, env: SessionEnv): Promise<boolean> {
  const secret = env.SESSION_SECRET;
  const version = env.SESSION_VERSION;
  if (!secret || !version) return false;
  const token = readCookie(request.headers.get("Cookie"));
  return verifySessionToken(secret, version, token);
}
