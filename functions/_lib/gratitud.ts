import type { GratitudeEntry } from "../../src/utils/gratitud";
import type { SessionEnv } from "./auth";

/** Clave única en el KV GRATITUD: el muro completo (lista corta, se lee de una vez). */
export const WALL_KEY = "muro";
/** Tope de nombres guardados (los más antiguos salen primero). */
export const WALL_LIMIT = 500;

export async function readWall(env: Pick<SessionEnv, "GRATITUD">): Promise<GratitudeEntry[]> {
  if (!env.GRATITUD) return [];
  try {
    const raw = await env.GRATITUD.get(WALL_KEY);
    const parsed = raw ? (JSON.parse(raw) as GratitudeEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeWall(env: Pick<SessionEnv, "GRATITUD">, wall: GratitudeEntry[]): Promise<void> {
  if (!env.GRATITUD) return;
  await env.GRATITUD.put(WALL_KEY, JSON.stringify(wall.slice(0, WALL_LIMIT)));
}
