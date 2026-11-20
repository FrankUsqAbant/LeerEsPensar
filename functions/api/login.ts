import type { SessionEnv } from "../_lib/auth";
import {
  accessCodesMatch,
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
  shouldSecureCookie,
} from "../_lib/auth";
import {
  clearLoginFailures,
  clientIp,
  isLoginRateLimited,
  recordLoginFailure,
} from "../_lib/rateLimit";

export const onRequestPost: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  const accessCode = env.ACCESS_CODE;
  const sessionSecret = env.SESSION_SECRET;
  const sessionVersion = env.SESSION_VERSION;
  const ip = clientIp(request);

  if (!accessCode || !sessionSecret || !sessionVersion) {
    return jsonResponse({ ok: false, error: "El acceso no está configurado." }, 500);
  }

  const limited = await isLoginRateLimited(env, ip);
  if (limited.limited) {
    return jsonResponse(
      { ok: false, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      429,
      { "Retry-After": String(limited.retryAfterSeconds) },
    );
  }

  let provided = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body?.code === "string") {
      provided = body.code.trim();
    }
  } catch {
    return jsonResponse({ ok: false, error: "La solicitud no es válida." }, 400);
  }

  if (!provided) {
    return jsonResponse({ ok: false, error: "Escribe el código de acceso." }, 400);
  }

  const matches = await accessCodesMatch(sessionSecret, provided, accessCode);
  if (!matches) {
    await recordLoginFailure(env, ip);
    return jsonResponse({ ok: false, error: "El código no es válido." }, 401);
  }

  await clearLoginFailures(env, ip);
  const token = await createSessionToken(sessionSecret, sessionVersion);
  const secure = shouldSecureCookie(request, env);
  return jsonResponse(
    { ok: true },
    200,
    { "Set-Cookie": sessionCookieHeader(token, secure) },
  );
};
