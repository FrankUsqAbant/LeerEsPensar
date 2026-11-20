import type { SessionEnv } from "../_lib/auth";
import { hasValidSession, jsonResponse } from "../_lib/auth";
import { applySecurityHeaders } from "../_lib/securityHeaders";

const SAFE_KEY = /^[A-Za-z0-9._/-]+$/;

interface PdfParams {
  path?: string | string[];
}

function pdfKeyFromParams(params: PdfParams | undefined): string {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.join("/");
  return typeof raw === "string" ? raw : "";
}

function fileNameFromKey(key: string): string {
  const parts = key.split("/").filter(Boolean);
  const segment = parts[parts.length - 1] || "libro.pdf";
  return segment.replace(/[\r\n"]/g, "");
}

function isAllowedPdfKey(key: string): boolean {
  if (!key || key.includes("..") || key.startsWith("/") || !SAFE_KEY.test(key)) {
    return false;
  }
  return key.toLowerCase().endsWith(".pdf");
}

export const onRequest: PagesFunction<SessionEnv> = async (context) => {
  const { request, env, params } = context;
  const allowed = await hasValidSession(request, env);
  if (!allowed) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return jsonResponse({ ok: false, error: "Método no permitido." }, 405, {
      Allow: "GET, HEAD",
    });
  }

  if (!env.BOOKS) {
    return jsonResponse({ ok: false, error: "La biblioteca de archivos no está configurada." }, 500);
  }

  const key = pdfKeyFromParams(params as PdfParams);
  if (!isAllowedPdfKey(key)) {
    return jsonResponse({ ok: false, error: "No encontramos este ejemplar." }, 404);
  }

  const object = await env.BOOKS.get(key);
  if (!object) {
    return jsonResponse({ ok: false, error: "No encontramos este ejemplar." }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Cache-Control", "private, no-store");
  headers.set("CDN-Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", 'inline; filename="' + fileNameFromKey(key) + '"');
  if (typeof object.size === "number") {
    headers.set("Content-Length", String(object.size));
  }
  applySecurityHeaders(headers);

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
};
