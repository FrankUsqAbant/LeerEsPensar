import { useCallback, useEffect, useState } from 'react';
import type { GratitudeEntry } from '../utils/gratitud';

/** Días que un nombre recién registrado muestra la etiqueta «nuevo». */
export const DIAS_NUEVO = 7;

export function isRecent(entry: GratitudeEntry, today = new Date()): boolean {
  const fecha = new Date(`${entry.fecha}T00:00:00`);
  return (today.getTime() - fecha.getTime()) / 86_400_000 < DIAS_NUEVO;
}

/** Muro de gratitud (lectura para todo el grupo). */
export function useGratitudeWall() {
  const [muro, setMuro] = useState<GratitudeEntry[]>([]);

  const refresh = useCallback(() => {
    fetch('/api/gratitud', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { muro?: GratitudeEntry[] } | null) => {
        if (data && Array.isArray(data.muro)) setMuro(data.muro);
      })
      .catch(() => undefined);
  }, []);

  useEffect(refresh, [refresh]);
  return { muro, setMuro, refresh };
}

export type AdminAction =
  | { accion: 'verificar' }
  | { accion: 'registrar'; nombre: string; apellido: string }
  | { accion: 'quitar'; id: string };

export interface AdminResult {
  ok: boolean;
  error?: string;
  muro?: GratitudeEntry[];
  registrado?: GratitudeEntry;
}

/** Llama a la administración del muro (solo con el código de Frank). */
export async function adminGratitud(codigo: string, action: AdminAction): Promise<AdminResult> {
  try {
    const res = await fetch('/api/gratitud-admin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, ...action }),
    });
    const data = (await res.json().catch(() => ({}))) as AdminResult;
    return res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? 'No se pudo completar.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Inténtalo de nuevo.' };
  }
}
