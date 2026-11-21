import type { SessionEnv } from "../_lib/auth";
import { hasValidSession, jsonResponse } from "../_lib/auth";
import { readWall } from "../_lib/gratitud";

/** Muro de gratitud para el grupo (con sesión): nombres más recientes primero. */
export const onRequestGet: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  const muro = await readWall(env);
  return jsonResponse({ ok: true, muro }, 200, { "Cache-Control": "private, max-age=60" });
};
