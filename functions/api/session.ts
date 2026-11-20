import type { SessionEnv } from "../_lib/auth";
import {
  clearSessionCookieHeader,
  hasValidSession,
  jsonResponse,
  shouldSecureCookie,
} from "../_lib/auth";

export const onRequestGet: PagesFunction<SessionEnv> = async (context) => {
  const ok = await hasValidSession(context.request, context.env);
  if (!ok) {
    return jsonResponse({ ok: false }, 401);
  }
  return jsonResponse({ ok: true });
};

export const onRequestDelete: PagesFunction<SessionEnv> = async (context) => {
  const secure = shouldSecureCookie(context.request, context.env);
  return jsonResponse(
    { ok: true },
    200,
    { "Set-Cookie": clearSessionCookieHeader(secure) },
  );
};
