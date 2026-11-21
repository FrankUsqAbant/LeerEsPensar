import { SUMMARY_MAX, buildFanPageCaption, cleanShortText } from "../../src/utils/fanPage";
import type { SessionEnv } from "../_lib/auth";
import { jsonResponse } from "../_lib/auth";
import { readJson, verifyAdmin } from "../_lib/admin";
import { publicarEnFacebook, aiReady, facebookReady, readQueue, writeQueue } from "../_lib/compartir";

interface AdminBody {
  codigo?: unknown;
  accion?: unknown;
  id?: unknown;
  resumen?: unknown;
  /** Tarjeta PNG en base64 (data URL), generada en el navegador de Frank. */
  imagen?: unknown;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Resumen corto sugerido por Gemini (gratis). Si no conoce el libro, no inventa. */
async function sugerirResumen(env: SessionEnv, titulo: string, autor: string): Promise<string> {
  const modelo = env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt =
    `Escribe en español un resumen de 2 frases (máximo 300 caracteres), cálido y sin revelar el final, ` +
    `del libro «${titulo}»${autor && autor !== "Autor desconocido" ? ` de ${autor}` : ""}. ` +
    `Solo el resumen, sin comillas ni títulos. Si no conoces este libro con certeza, responde exactamente: DESCONOCIDO`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini respondió ${res.status}`);
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const salida = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  return salida.toUpperCase().includes("DESCONOCIDO") ? "" : cleanShortText(salida, SUMMARY_MAX);
}

/** Publica la tarjeta como foto en la fan page (Graph API). */

/**
 * Publicaciones de la fan page (solo Frank): listar pendientes, descartar, sugerir resumen,
 * publicar en Facebook o marcar como publicada a mano.
 */
export const onRequestPost: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  const body = await readJson<AdminBody>(request);
  if (!body) return jsonResponse({ ok: false, error: "Solicitud no válida." }, 400);
  const denegado = await verifyAdmin(request, env, body.codigo);
  if (denegado) return denegado;

  const accion = texto(body.accion, 20);
  const cola = await readQueue(env);
  const estado = { facebook: facebookReady(env), ia: aiReady(env) };
  const id = texto(body.id, 60);
  const post = cola.find((p) => p.id === id);

  if (accion === "descartar" || accion === "marcar") {
    const nueva = cola.filter((p) => p.id !== id);
    await writeQueue(env, nueva);
    return jsonResponse({ ok: true, pendientes: nueva, ...estado });
  }

  if (accion === "resumen") {
    if (!post) return jsonResponse({ ok: false, error: "Esa publicación ya no está." }, 404);
    if (!estado.ia) return jsonResponse({ ok: false, error: "La IA no está configurada." }, 400);
    try {
      const resumen = await sugerirResumen(env, post.titulo, post.autor);
      return jsonResponse({ ok: true, resumen, desconocido: !resumen });
    } catch (e) {
      return jsonResponse({ ok: false, error: `No se pudo sugerir el resumen: ${(e as Error).message}` }, 502);
    }
  }

  if (accion === "publicar") {
    if (!post) return jsonResponse({ ok: false, error: "Esa publicación ya no está." }, 404);
    if (!estado.facebook) return jsonResponse({ ok: false, error: "Facebook no está conectado todavía." }, 400);
    const caption = buildFanPageCaption(post, texto(body.resumen, SUMMARY_MAX));
    try {
      const postId = await publicarEnFacebook(env, texto(body.imagen, 12_000_000), caption);
      const nueva = cola.filter((p) => p.id !== id);
      await writeQueue(env, nueva);
      return jsonResponse({ ok: true, postId, pendientes: nueva, ...estado });
    } catch (e) {
      return jsonResponse({ ok: false, error: `No se pudo publicar: ${(e as Error).message}` }, 502);
    }
  }

  return jsonResponse({ ok: true, pendientes: cola, ...estado });
};
