import { normalizeSearchText } from '../data/catalogEngine';
import type { BookGenre, BookIndexEntry, BookMood } from '../types/folio';

export interface BookshelfFilterState {
  search: string;
  genre: BookGenre | 'Todos';
  authorId: string | 'Todos';
  mood?: BookMood | 'Todos';
}

export interface ShelfBookSlot {
  book: BookIndexEntry;
  isMatch: boolean;
  /** Altura relativa del lomo/cubierta en px dentro del estante */
  heightPx: number;
  /** Inclinación sutil en grados para dar vida orgánica */
  tiltDeg: number;
}

export interface BookshelfRow {
  index: number;
  label: string;
  slots: ShelfBookSlot[];
  matchCount: number;
}

export interface BookshelfComputation {
  rows: BookshelfRow[];
  matchedIds: Set<string>;
  totalMatches: number;
  hasActiveFilter: boolean;
  firstMatchedRowIndex: number | null;
}

export interface SlidingShelfComputation {
  rows: BookshelfRow[];
  filteredBooks: BookIndexEntry[];
  totalMatches: number;
  hasActiveFilter: boolean;
}

const SHELF_LABELS = [
  'Repisa superior',
  'Repisa inferior',
  'Repisa III',
  'Repisa IV',
];

export function matchesBookshelfFilters(
  book: BookIndexEntry,
  filters: BookshelfFilterState,
): boolean {
  if (filters.genre !== 'Todos' && book.genre !== filters.genre) return false;
  if (filters.authorId !== 'Todos' && book.authorId !== filters.authorId) return false;
  if (filters.mood && filters.mood !== 'Todos' && !book.moods.includes(filters.mood)) {
    return false;
  }

  const q = normalizeSearchText(filters.search);
  if (q.length > 0) {
    const haystack = normalizeSearchText(
      `${book.title} ${book.subtitle ?? ''} ${book.authorName} ${book.genre} ${book.moods.join(' ')} ${book.hookSummary}`,
    );
    if (!haystack.includes(q)) return false;
  }

  return true;
}

export function isFilterActive(filters: BookshelfFilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.genre !== 'Todos' ||
    filters.authorId !== 'Todos' ||
    Boolean(filters.mood && filters.mood !== 'Todos')
  );
}

/**
 * Filtra el catálogo para mostrar exclusivamente las obras que coinciden
 * con búsqueda, género o escritor seleccionados.
 */
export function filterBooksForShelf(
  books: readonly BookIndexEntry[],
  filters: BookshelfFilterState,
): BookIndexEntry[] {
  if (!isFilterActive(filters)) {
    return [...books];
  }
  return books.filter((book) => matchesBookshelfFilters(book, filters));
}

export function computeBookHeightPx(pageCount: number): number {
  const clamped = Math.max(60, Math.min(240, pageCount));
  // Rango compacto (128–144px) para ver las 3 repisas de un vistazo
  return Math.round(128 + ((clamped - 60) / 180) * 16);
}

/**
 * Construye estanterías deslizables horizontalmente a partir de los libros ya filtrados:
 * - Si hay <= 6 obras visibles, las agrupa en 1 repisa enfocada.
 * - Si hay > 6 obras, las equilibra en 2 repisas deslizables de izquierda a derecha.
 */
export function buildSlidingShelves(
  books: readonly BookIndexEntry[],
  filters: BookshelfFilterState,
): SlidingShelfComputation {
  const hasActiveFilter = isFilterActive(filters);
  const filteredBooks = filterBooksForShelf(books, filters);

  if (filteredBooks.length === 0) {
    return {
      rows: [],
      filteredBooks: [],
      totalMatches: 0,
      hasActiveFilter,
    };
  }

  const chunks: BookIndexEntry[][] =
    filteredBooks.length <= 6
      ? [filteredBooks]
      : (() => {
          // 2 repisas equilibradas (16 → 8 / 8): el estante se lee entero en la portada
          const n = filteredBooks.length;
          const base = Math.floor(n / 2);
          const extra = n % 2;
          let start = 0;
          return [0, 1].map((i) => {
            const size = base + (i < extra ? 1 : 0);
            const chunk = filteredBooks.slice(start, start + size);
            start += size;
            return chunk;
          });
        })();

  const tiltPattern = [-1.0, 0.4, -0.3, 0.9, -0.7, 0.3];

  const rows: BookshelfRow[] = chunks.map((chunk, rowIndex) => ({
    index: rowIndex,
    label: SHELF_LABELS[rowIndex] ?? `Repisa ${rowIndex + 1}`,
    matchCount: chunk.length,
    slots: chunk.map((book, idxInRow) => ({
      book,
      isMatch: true,
      heightPx: computeBookHeightPx(book.pageCount),
      tiltDeg: tiltPattern[(rowIndex + idxInRow) % tiltPattern.length],
    })),
  }));

  return {
    rows,
    filteredBooks,
    totalMatches: filteredBooks.length,
    hasActiveFilter,
  };
}

export interface LibraryShelfOptions {
  /** Libros en la repisa "Recién llegados". */
  newestCount: number;
  /** Tamaño aproximado de cada repisa alfabética (se cortan por letra inicial del autor). */
  sectionSize: number;
  /** Libros por repisa cuando hay búsqueda o género. */
  resultsPerRow: number;
  /** Semilla del día: ordena "Recién llegados" y "Portadas destacadas" de forma estable en el día. */
  daySeed: number;
  /** Libros en la repisa de bienvenida "Portadas destacadas" (0 = sin esa repisa). */
  featuredCount?: number;
  /** Puntaje mínimo de portada real para la bienvenida (0–100). */
  featuredMinScore?: number;
}

export interface LibraryShelfComputation extends SlidingShelfComputation {
  /** Libros que están en alguna repisa (para "X libros en la biblioteca"). */
  shown: number;
  hasMore: boolean;
}

const AUTOR_DESCONOCIDO = 'Autor desconocido';

function initialOf(name: string): string {
  const letter = normalizeSearchText(name).replace(/[^a-z]/g, '').charAt(0).toUpperCase();
  return letter || '#';
}

/** Barajado estable (mismo resultado para la misma semilla). */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function daySeedFor(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

/**
 * Estante para la biblioteca grande: TODOS los libros quedan en alguna repisa.
 * - Sin filtros: "Recién llegados" y luego repisas por autor, como en una biblioteca
 *   ("Autores A – B", "C", …; ~sectionSize libros cada una) y al final "Autor desconocido".
 * - Con búsqueda o género: los resultados, en repisas de resultsPerRow libros.
 * Cada repisa se recorre de lado a lado; el componente dibuja solo los libros visibles.
 */
export function buildLibraryShelves(
  books: readonly BookIndexEntry[],
  filters: BookshelfFilterState,
  options: LibraryShelfOptions,
): LibraryShelfComputation {
  const hasActiveFilter = isFilterActive(filters);
  const filteredBooks = filterBooksForShelf(books, filters);
  const { newestCount, sectionSize, resultsPerRow, daySeed, featuredCount = 0, featuredMinScore = 70 } = options;
  const byAuthor = (a: BookIndexEntry, b: BookIndexEntry) =>
    a.authorName.localeCompare(b.authorName, 'es') || a.title.localeCompare(b.title, 'es');

  const groups: Array<{ label: string; books: BookIndexEntry[] }> = [];
  if (hasActiveFilter) {
    const ordered = [...filteredBooks].sort(byAuthor);
    for (let start = 0; start < ordered.length; start += resultsPerRow) {
      groups.push({
        label: start === 0 ? 'Resultados' : 'Más resultados',
        books: ordered.slice(start, start + resultsPerRow),
      });
    }
  } else {
    // Bienvenida: las portadas reales más vistosas; cada día 24 distintas entre las mejores.
    const featured = featuredCount
      ? seededShuffle(
          filteredBooks
            .filter((b) => (b.coverScore ?? 0) >= featuredMinScore)
            .sort((a, b) => (b.coverScore ?? 0) - (a.coverScore ?? 0))
            .slice(0, featuredCount * 3),
          daySeed,
        ).slice(0, featuredCount)
      : [];
    if (featured.length >= 6) groups.push({ label: 'Portadas destacadas', books: featured });
    const featuredIds = new Set(featured.length >= 6 ? featured.map((b) => b.id) : []);

    const newest = seededShuffle(
      filteredBooks
        .filter((b) => !featuredIds.has(b.id))
        .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
        .slice(0, newestCount),
      daySeed,
    );
    if (newest.length) groups.push({ label: 'Recién llegados', books: newest });

    const known = filteredBooks.filter((b) => b.authorName !== AUTOR_DESCONOCIDO).sort(byAuthor);
    const unknown = filteredBooks.filter((b) => b.authorName === AUTOR_DESCONOCIDO).sort(byAuthor);
    let current: BookIndexEntry[] = [];
    let first = '';
    let last = '';
    const flush = () => {
      if (!current.length) return;
      groups.push({ label: first === last ? `Autores ${first}` : `Autores ${first} – ${last}`, books: current });
      current = [];
    };
    for (let i = 0; i < known.length; i += 1) {
      const letter = initialOf(known[i].authorName);
      if (!current.length) first = letter;
      // Solo se corta al cambiar de letra, para no partir un autor entre repisas.
      if (current.length >= sectionSize && letter !== last) {
        flush();
        first = letter;
      }
      current.push(known[i]);
      last = letter;
    }
    flush();
    if (unknown.length) groups.push({ label: AUTOR_DESCONOCIDO, books: unknown });
  }

  const tiltPattern = [-1.0, 0.4, -0.3, 0.9, -0.7, 0.3];
  const rows: BookshelfRow[] = groups.map((group, rowIndex) => ({
    index: rowIndex,
    label: group.label,
    matchCount: group.books.length,
    slots: group.books.map((book, idxInRow) => ({
      book,
      isMatch: true,
      heightPx: computeBookHeightPx(book.pageCount),
      tiltDeg: tiltPattern[(rowIndex + idxInRow) % tiltPattern.length],
    })),
  }));

  return {
    rows,
    filteredBooks,
    totalMatches: filteredBooks.length,
    hasActiveFilter,
    shown: filteredBooks.length,
    hasMore: false,
  };
}

/**
 * Distribuye los libros en repisas arquitectónicas manteniendo compatibilidad
 * con utilidades previas de cálculo por bloques.
 */
export function computeBookshelfLayout(
  books: readonly BookIndexEntry[],
  filters: BookshelfFilterState,
  booksPerShelf = 4,
): BookshelfComputation {
  const safePerShelf = Math.max(2, Math.min(8, Math.floor(booksPerShelf)));
  const hasActiveFilter = isFilterActive(filters);

  const matchedIds = new Set<string>();
  const rows: BookshelfRow[] = [];
  let firstMatchedRowIndex: number | null = null;

  for (let start = 0; start < books.length; start += safePerShelf) {
    const rowIndex = rows.length;
    const chunk = books.slice(start, start + safePerShelf);
    let rowMatches = 0;

    const slots: ShelfBookSlot[] = chunk.map((book, idxInRow) => {
      const isMatch = hasActiveFilter ? matchesBookshelfFilters(book, filters) : true;
      if (isMatch) {
        matchedIds.add(book.id);
        rowMatches += 1;
      }

      const tiltPattern = [-1.2, 0.6, 0, 1.1];
      return {
        book,
        isMatch,
        heightPx: computeBookHeightPx(book.pageCount),
        tiltDeg: tiltPattern[(rowIndex + idxInRow) % tiltPattern.length],
      };
    });

    if (hasActiveFilter && rowMatches > 0 && firstMatchedRowIndex === null) {
      firstMatchedRowIndex = rowIndex;
    }

    rows.push({
      index: rowIndex,
      label: SHELF_LABELS[rowIndex] ?? `Repisa ${rowIndex + 1}`,
      slots,
      matchCount: rowMatches,
    });
  }

  return {
    rows,
    matchedIds,
    totalMatches: matchedIds.size,
    hasActiveFilter,
    firstMatchedRowIndex,
  };
}

export type PhysicalBookStance = 'frontal' | 'angled';

export interface PhysicalBookStyle {
  stance: PhysicalBookStance;
  /** Grosor lateral de las páginas crema visibles en px */
  pageBlockWidthPx: number;
  /** Ancho del lomo de tela/lino en px */
  spineWidthPx: number;
  /** Inclinación natural orgánica sobre la repisa en grados */
  leanDeg: number;
}

export function computePhysicalBookStyle(
  pageCount: number,
  rowIndex: number,
  slotIndex: number,
): PhysicalBookStyle {
  const clampedPages = Math.max(60, Math.min(240, pageCount));
  const pageBlockWidthPx = Math.round(5 + ((clampedPages - 60) / 180) * 4);

  const isAngled = (rowIndex + slotIndex) % 4 === 2;

  const leanPattern = [-0.9, 0.4, -1.7, 0.7, -0.4, 1.1];
  const leanDeg = isAngled
    ? rowIndex % 2 === 0
      ? -1.8
      : 1.5
    : leanPattern[(rowIndex + slotIndex) % leanPattern.length];

  return {
    stance: isAngled ? 'angled' : 'frontal',
    pageBlockWidthPx,
    spineWidthPx: isAngled ? 12 : 10,
    leanDeg,
  };
}
