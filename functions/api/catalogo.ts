import type { SessionEnv } from "../_lib/auth";
import { hasValidSession, jsonResponse } from "../_lib/auth";
import { applySecurityHeaders } from "../_lib/securityHeaders";

/** Clave del catálogo público dentro del bucket (lo genera scripts/biblioteca/publicar-catalogo.mjs). */
const CATALOG_KEY = "catalogo.json";

/**
 * Catálogo de la biblioteca. Es privado como los PDFs: solo responde con sesión
 * (código de acceso del grupo). Se guarda en caché del navegador 5 minutos.
 */
export const onRequestGet: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  if (!env.BOOKS) {
    return jsonResponse({ ok: false, error: "La biblioteca de archivos no está configurada." }, 500);
  }

  const object = await env.BOOKS.get(CATALOG_KEY);
  if (!object) {
    return jsonResponse({ ok: false, error: "El catálogo todavía no está publicado." }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "private, max-age=300");
  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  applySecurityHeaders(headers);
  return new Response(object.body, { status: 200, headers });
};
