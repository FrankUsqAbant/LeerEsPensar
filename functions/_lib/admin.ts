import type { SessionEnv } from "./auth";
import { accessCodesMatch, hasValidSession, jsonResponse } from "./auth";
import { clearLoginFailures, clientIp, isLoginRateLimited, recordLoginFailure } from "./rateLimit";

/**
 * Verifica que quien llama es Frank: sesión del grupo + ADMIN_CODE, con límite de
 * intentos fallidos por IP (5 fallos → 15 minutos). Devuelve una respuesta de error
 * o null si todo está bien.
 */
export async function verifyAdmin(
  request: Request,
  env: SessionEnv,
  codigo: unknown,
): Promise<Response | null> {
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  if (!env.ADMIN_CODE || !env.SESSION_SECRET || !env.GRATITUD) {
    return jsonResponse({ ok: false, error: "La administración no está configurada." }, 500);
  }
  const ip = `admin:${clientIp(request)}`;
  const limite = await isLoginRateLimited(env, ip);
  if (limite.limited) {
    return jsonResponse({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, 429, {
      "Retry-After": String(limite.retryAfterSeconds),
    });
  }
  const texto = typeof codigo === "string" ? codigo.slice(0, 200) : "";
  if (!texto || !(await accessCodesMatch(env.SESSION_SECRET, texto, env.ADMIN_CODE))) {
    await recordLoginFailure(env, ip);
    return jsonResponse({ ok: false, error: "Código de administrador incorrecto." }, 401);
  }
  await clearLoginFailures(env, ip);
  return null;
}

/** Lee el cuerpo JSON sin romper si viene mal formado. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
