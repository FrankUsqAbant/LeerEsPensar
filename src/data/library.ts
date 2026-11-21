import { useEffect, useState } from 'react';
import type { BookCoverStyle, BookIndexEntry, CoverTheme } from '../types/folio';
import { getCatalogBooks, normalizeSearchText } from './catalogEngine';

/** Un libro tal como lo publica scripts/biblioteca/publicar-catalogo.mjs (catalogo.json en R2). */
export interface PublicCatalogEntry {
  id: string;
  titulo: string;
  autor: string;
  anio: number | null;
  paginas: number | null;
  bytes: number;
  genero: string;
  clave: string;
  agregado: string;
  /** Tiene portada real aprobada (miniatura en R2: portadas/<id>.webp). */
  portada?: boolean;
  /** Puntaje de la portada real (0–100). */
  puntaje?: number;
}

export interface PublicCatalog {
  version: number;
  generado: string;
  total: number;
  libros: PublicCatalogEntry[];
}

/** Género de los libros que aún no se clasificaron: no se muestra en portadas ni filtros. */
export const SIN_GENERO = 'Sin clasificar';

const STYLES: BookCoverStyle[] = ['cloth-frame', 'half-bound', 'linen-medallion', 'arch-monogram'];

/** Paletas de las 16 portadas originales: los libros nuevos toman una según su nombre. */
const PALETTES: CoverTheme[] = getCatalogBooks().map((b) => b.coverTheme);

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Portada estable por libro: misma paleta y estilo cada vez que se abre la página. */
export function coverThemeFor(id: string): CoverTheme {
  const h = hash(id);
  return { ...PALETTES[h % PALETTES.length], style: STYLES[(h >>> 7) % STYLES.length] };
}

/** ~1,5 minutos por página como lectura estimada (mínimo 5 minutos). */
export function estimateReadingMinutes(pages: number | null): number {
  return Math.max(5, Math.round((pages ?? 60) * 1.5));
}

/** Convierte una entrada del catálogo público al formato que usa el estante. No inventa textos. */
export function toBook(entry: PublicCatalogEntry): BookIndexEntry {
  return {
    id: entry.id,
    slug: entry.id,
    title: entry.titulo,
    authorId: normalizeSearchText(entry.autor).replace(/[^a-z0-9]+/g, '-'),
    authorName: entry.autor,
    genre: entry.genero,
    moods: [],
    publicationYear: entry.anio ?? 0,
    pageCount: entry.paginas ?? 0,
    readingTimeMinutes: estimateReadingMinutes(entry.paginas),
    language: 'es',
    coverTheme: coverThemeFor(entry.id),
    hookSummary: '',
    takeaways: [],
    firstSip: '',
    pdfUrl: `/pdf/${entry.clave}`,
    pdfSizeBytes: entry.bytes,
    downloadOnly: true,
    addedAt: entry.agregado,
    ...(entry.portada ? { coverImage: `/portada/${entry.id}.webp`, coverScore: entry.puntaje ?? 0 } : {}),
  };
}

/** Enlace de descarga del PDF real con un nombre legible ("Título - Autor.pdf"). */
export function downloadUrlFor(book: BookIndexEntry): string {
  const nombre = book.authorName && book.authorName !== 'Autor desconocido'
    ? `${book.title} - ${book.authorName}`
    : book.title;
  return `${book.pdfUrl}?descargar=1&nombre=${encodeURIComponent(nombre)}`;
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type LibraryStatus = 'cargando' | 'biblioteca' | 'seleccion';

/**
 * Libros del estante: la biblioteca completa desde /api/catalogo (privado, con sesión).
 * Mientras carga, o si no está disponible, se muestra la selección original de 16 libros.
 */
export function useLibraryBooks(): { books: readonly BookIndexEntry[]; status: LibraryStatus } {
  const [state, setState] = useState<{ books: readonly BookIndexEntry[]; status: LibraryStatus }>(() => ({
    books: getCatalogBooks(),
    status: 'cargando',
  }));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/catalogo', { credentials: 'same-origin' })
      .then((res) => (res.ok ? (res.json() as Promise<PublicCatalog>) : null))
      .then((catalog) => {
        if (cancelled) return;
        if (catalog && Array.isArray(catalog.libros) && catalog.libros.length > 0) {
          setState({ books: catalog.libros.map(toBook), status: 'biblioteca' });
        } else {
          setState((prev) => ({ ...prev, status: 'seleccion' }));
        }
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, status: 'seleccion' }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
