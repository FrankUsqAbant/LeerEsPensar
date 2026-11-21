import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { BookIndexEntry } from '../types/folio';
import type { FanPagePost } from '../utils/fanPage';
import { formatGratitudeName } from '../utils/gratitud';

const LECTOR_KEY = 'lep:lector';

function leerLector(): { nombre: string; apellido: string } {
  try {
    const raw = window.localStorage.getItem(LECTOR_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return { nombre: String(v?.nombre ?? ''), apellido: String(v?.apellido ?? '') };
  } catch {
    return { nombre: '', apellido: '' };
  }
}

/**
 * El lector comparte que leyó un libro: queda pendiente en el panel de Frank y, al
 * aprobarse, se publica en la fan page. Recuerda su nombre en este navegador.
 */
export function useFanPageShare(book: BookIndexEntry | null) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guardado = leerLector();
    setNombre(guardado.nombre);
    setApellido(guardado.apellido);
    setComentario('');
    setEnviado(null);
    setPublicado(false);
    setError(null);
  }, [book?.id]);

  const vistaPrevia = formatGratitudeName(nombre, apellido);

  /** `tarjeta` dibuja la imagen con el nombre del lector (data URL JPEG). */
  const enviar = async (e: FormEvent, tarjeta?: (lector: string) => Promise<string | null>) => {
    e.preventDefault();
    if (!book) return;
    if (!vistaPrevia) {
      setError('Escribe tu nombre y apellido (solo letras).');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const imagen = (await tarjeta?.(vistaPrevia).catch(() => null)) ?? undefined;
      const res = await fetch('/api/compartir', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libroId: book.id,
          titulo: book.title,
          autor: book.authorName,
          nombre,
          apellido,
          comentario,
          imagen,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; nombre?: string; error?: string; publicado?: boolean };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'No se pudo enviar. Inténtalo de nuevo.');
      try {
        window.localStorage.setItem(LECTOR_KEY, JSON.stringify({ nombre, apellido }));
      } catch {
        // Sin almacenamiento: la próxima vez pedirá el nombre otra vez.
      }
      setPublicado(Boolean(data.publicado));
      setEnviado(data.nombre ?? vistaPrevia);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return { nombre, setNombre, apellido, setApellido, comentario, setComentario, vistaPrevia, enviando, enviado, publicado, error, enviar };
}

export interface FanPageAdminState {
  pendientes: FanPagePost[];
  facebook: boolean;
  ia: boolean;
}

/** Administración de publicaciones (solo con el código de Frank). */
export async function adminCompartir(
  codigo: string,
  payload: { accion: 'listar' | 'descartar' | 'marcar' | 'resumen' | 'publicar'; id?: string; resumen?: string; imagen?: string },
): Promise<{ ok: boolean; error?: string; resumen?: string; desconocido?: boolean } & Partial<FanPageAdminState>> {
  try {
    const res = await fetch('/api/compartir-admin', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? 'No se pudo completar.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Inténtalo de nuevo.' };
  }
}
