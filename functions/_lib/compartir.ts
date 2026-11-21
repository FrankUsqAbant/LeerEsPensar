import type { FanPagePost } from "../../src/utils/fanPage";
import type { SessionEnv } from "./auth";

/** Cola de publicaciones pendientes para la fan page (en el KV GRATITUD). */
export const QUEUE_KEY = "fb-pendientes";
export const QUEUE_LIMIT = 100;

export async function readQueue(env: Pick<SessionEnv, "GRATITUD">): Promise<FanPagePost[]> {
  if (!env.GRATITUD) return [];
  try {
    const raw = await env.GRATITUD.get(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FanPagePost[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeQueue(env: Pick<SessionEnv, "GRATITUD">, queue: FanPagePost[]): Promise<void> {
  if (!env.GRATITUD) return;
  await env.GRATITUD.put(QUEUE_KEY, JSON.stringify(queue.slice(0, QUEUE_LIMIT)));
}

/** Facebook listo para publicar solo (token de la página + ID). */
export const facebookReady = (env: SessionEnv) => Boolean(env.FB_PAGE_ID && env.FB_PAGE_TOKEN);
/** IA lista para sugerir resúmenes. */
export const aiReady = (env: SessionEnv) => Boolean(env.GEMINI_API_KEY);

/** Sube la tarjeta a la fan page como foto con su texto. Devuelve el id de la publicación. */
export async function publicarEnFacebook(env: SessionEnv, pngDataUrl: string, caption: string): Promise<string> {
  const tipo = /^data:image\/jpeg/.test(pngDataUrl) ? "image/jpeg" : "image/png";
  const base64 = pngDataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.length < 1000 || bytes.length > 8_000_000) throw new Error("La imagen no es válida.");
  const form = new FormData();
  form.append("source", new Blob([bytes], { type: tipo }), tipo === "image/jpeg" ? "leeresp.jpg" : "leeresp.png");
  form.append("caption", caption);
  form.append("access_token", env.FB_PAGE_TOKEN ?? "");
  const version = env.FB_GRAPH_VERSION || "v23.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${env.FB_PAGE_ID}/photos`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { post_id?: string; id?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Facebook respondió ${res.status}`);
  return data.post_id ?? data.id ?? "";
}
