import type { SessionEnv } from "../_lib/auth";
import { hasValidSession, jsonResponse } from "../_lib/auth";
import { applySecurityHeaders } from "../_lib/securityHeaders";

/** Solo nombres generados por scripts/biblioteca/portadas.py: "<slug>.webp". */
const SAFE_NAME = /^[a-z0-9-]{1,120}\.webp$/;

/**
 * Portadas reales de los libros (miniaturas WebP en R2, carpeta portadas/).
 * Privadas como los PDFs: solo con sesión. El navegador las guarda una semana.
 */
export const onRequestGet: PagesFunction<SessionEnv> = async (context) => {
  const { request, env, params } = context;
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  if (!env.BOOKS) {
    return jsonResponse({ ok: false, error: "La biblioteca de archivos no está configurada." }, 500);
  }

  const raw = params.path;
  const name = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  if (!SAFE_NAME.test(name)) {
    return jsonResponse({ ok: false, error: "Portada no encontrada." }, 404);
  }

  const object = await env.BOOKS.get(`portadas/${name}`);
  if (!object) {
    return jsonResponse({ ok: false, error: "Portada no encontrada." }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", "image/webp");
  headers.set("Cache-Control", "private, max-age=604800");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  applySecurityHeaders(headers);
  return new Response(object.body, { status: 200, headers });
};
