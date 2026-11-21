import { COMMENT_MAX, cleanShortText } from "../../src/utils/fanPage";
import { formatGratitudeName } from "../../src/utils/gratitud";
import type { SessionEnv } from "../_lib/auth";
import { hasValidSession, jsonResponse } from "../_lib/auth";
import { readJson } from "../_lib/admin";
import { readQueue, writeQueue } from "../_lib/compartir";
import { clientIp } from "../_lib/rateLimit";

interface ShareBody {
  libroId?: unknown;
  titulo?: unknown;
  autor?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  comentario?: unknown;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? cleanShortText(v, max) : "");
const POR_HORA = 5;

/**
 * Un lector comparte que leyó un libro: queda pendiente para que Frank lo apruebe y
 * se publique en la fan page. Se guarda solo "Nombre + inicial". Máximo 5 por hora por IP.
 */
export const onRequestPost: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  if (!(await hasValidSession(request, env))) {
    return jsonResponse({ ok: false, error: "Necesitas un código de acceso." }, 401);
  }
  if (!env.GRATITUD) {
    return jsonResponse({ ok: false, error: "Compartir no está disponible ahora." }, 500);
  }
  const body = await readJson<ShareBody>(request);
  if (!body) return jsonResponse({ ok: false, error: "Solicitud no válida." }, 400);

  const nombre = formatGratitudeName(texto(body.nombre, 60), texto(body.apellido, 60));
  const libroId = texto(body.libroId, 120).replace(/[^a-z0-9-]/g, "");
  const titulo = texto(body.titulo, 150);
  const autor = texto(body.autor, 100);
  if (!nombre) {
    return jsonResponse({ ok: false, error: "Escribe tu nombre y apellido (solo letras)." }, 400);
  }
  if (!libroId || !titulo) {
    return jsonResponse({ ok: false, error: "No encontramos el libro." }, 400);
  }

  // Límite simple por IP para evitar abusos.
  const claveLimite = `fb-rl:${clientIp(request)}`;
  const usados = Number((await env.GRATITUD.get(claveLimite)) ?? "0");
  if (usados >= POR_HORA) {
    return jsonResponse({ ok: false, error: "Ya compartiste varios libros. Inténtalo en un rato." }, 429);
  }
  await env.GRATITUD.put(claveLimite, String(usados + 1), { expirationTtl: 3600 });

  const post = {
    id: crypto.randomUUID(),
    libroId,
    titulo,
    autor,
    nombre,
    comentario: texto(body.comentario, COMMENT_MAX),
    fecha: new Date().toISOString().slice(0, 10),
  };
  await writeQueue(env, [post, ...(await readQueue(env))]);
  return jsonResponse({ ok: true, nombre });
};
