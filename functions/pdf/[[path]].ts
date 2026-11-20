import { hasValidSession, jsonResponse } from "../_lib/auth";

const SAFE_KEY = /^[A-Za-z0-9._/-]+$/;

function pdfKeyFromParams(params) {
  const raw = params?.path;
  if (Array.isArray(raw)) return raw.join("/");
  return typeof raw === "string" ? raw : "";
}

function fileNameFromKey(key) {
  const parts = key.split("/").filter(Boolean);
  const segment = parts[parts.length - 1] || "libro.pdf";
  return segment.replace(/[\r\n"]/g, "");
}

export const onRequestGet = async (context) => {
  const { request, env, params } = context;
  const allowed = await hasValidSession(request, env);
  if (!allowed) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }

  if (!env.BOOKS) {
    return jsonResponse({ ok: false, error: "La biblioteca de archivos no está configurada." }, 500);
  }

  const key = pdfKeyFromParams(params);
  if (!key || key.includes("..") || key.startsWith("/") || !SAFE_KEY.test(key)) {
    return jsonResponse({ ok: false, error: "La ruta del archivo no es válida." }, 400);
  }

  const object = await env.BOOKS.get(key);
  if (!object) {
    return jsonResponse({ ok: false, error: "No encontramos este ejemplar." }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/pdf");
  headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", 'inline; filename="' + fileNameFromKey(key) + '"');
  if (typeof object.size === "number") {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(object.body, { status: 200, headers });
};
