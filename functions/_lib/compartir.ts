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
