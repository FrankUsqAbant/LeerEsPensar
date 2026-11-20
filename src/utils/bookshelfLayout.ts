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
  // Rango elegante entre 198px y 236px
  return Math.round(198 + ((clamped - 60) / 180) * 38);
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
      : [
          filteredBooks.slice(0, Math.ceil(filteredBooks.length / 2)),
          filteredBooks.slice(Math.ceil(filteredBooks.length / 2)),
        ];

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
  const pageBlockWidthPx = Math.round(7 + ((clampedPages - 60) / 180) * 6);

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
    spineWidthPx: isAngled ? 16 : 13,
    leanDeg,
  };
}
