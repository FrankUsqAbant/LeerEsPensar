import { formatGratitudeName } from "../../src/utils/gratitud";
import type { SessionEnv } from "../_lib/auth";
import { accessCodesMatch, hasValidSession, jsonResponse } from "../_lib/auth";
import { readWall, writeWall } from "../_lib/gratitud";
import {
  clearLoginFailures,
  clientIp,
  isLoginRateLimited,
  recordLoginFailure,
} from "../_lib/rateLimit";

interface AdminBody {
  codigo?: unknown;
  accion?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  id?: unknown;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * Administración del muro (solo Frank): verificar el código, registrar un donante o quitarlo.
 * Exige la sesión del grupo y además ADMIN_CODE. Los intentos fallidos se limitan por IP
 * con el mismo mecanismo que el ingreso (5 fallos → espera de 15 minutos).
 */
export const onRequestPost: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  if (!env.ADMIN_CODE || !env.SESSION_SECRET || !env.GRATITUD) {
    return jsonResponse({ ok: false, error: "La administración no está configurada." }, 500);
  }

  const ip = `admin:${clientIp(request)}`;
  const limite = await isLoginRateLimited(env, ip);
  if (limite.limited) {
    return jsonResponse(
      { ok: false, error: "Demasiados intentos. Espera unos minutos." },
      429,
      { "Retry-After": String(limite.retryAfterSeconds) },
    );
  }

  let body: AdminBody;
  try {
    body = (await request.json()) as AdminBody;
  } catch {
    return jsonResponse({ ok: false, error: "Solicitud no válida." }, 400);
  }

  const codigo = texto(body.codigo, 200);
  if (!codigo || !(await accessCodesMatch(env.SESSION_SECRET, codigo, env.ADMIN_CODE))) {
    await recordLoginFailure(env, ip);
    return jsonResponse({ ok: false, error: "Código de administrador incorrecto." }, 401);
  }
  await clearLoginFailures(env, ip);

  const accion = texto(body.accion, 20);
  const muro = await readWall(env);

  if (accion === "registrar") {
    const nombre = formatGratitudeName(texto(body.nombre, 60), texto(body.apellido, 60));
    if (!nombre) {
      return jsonResponse({ ok: false, error: "Escribe un nombre y un apellido válidos (solo letras)." }, 400);
    }
    const entrada = {
      id: crypto.randomUUID(),
      nombre,
      fecha: new Date().toISOString().slice(0, 10),
    };
    const nuevo = [entrada, ...muro];
    await writeWall(env, nuevo);
    return jsonResponse({ ok: true, registrado: entrada, muro: nuevo });
  }

  if (accion === "quitar") {
    const id = texto(body.id, 60);
    const nuevo = muro.filter((e) => e.id !== id);
    await writeWall(env, nuevo);
    return jsonResponse({ ok: true, muro: nuevo });
  }

  // "verificar": solo confirma el código y devuelve el muro.
  return jsonResponse({ ok: true, muro });
};
