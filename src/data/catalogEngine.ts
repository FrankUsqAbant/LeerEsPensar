import rawCatalog from './catalog-index.json';
import type {
  Author,
  BookGenre,
  BookIndexEntry,
  BookMood,
  CatalogQuery,
  PaginatedCatalogResult,
} from '../types/folio';

interface RawCatalogPayload {
  version: string;
  generatedAt: string;
  authors: Author[];
  books: BookIndexEntry[];
}

const catalogPayload = rawCatalog as RawCatalogPayload;

const AUTHOR_MAP = new Map<string, Author>(
  catalogPayload.authors.map((author) => [author.id, author]),
);

const BOOK_INDEX: BookIndexEntry[] = catalogPayload.books;

/** Normaliza texto eliminando diacríticos y mayúsculas para búsquedas tolerantes y rápidas. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getAllAuthors(): Author[] {
  return catalogPayload.authors;
}

export function getAuthorById(authorId: string): Author | undefined {
  return AUTHOR_MAP.get(authorId);
}

export function getAllGenres(books: readonly BookIndexEntry[] = BOOK_INDEX): BookGenre[] {
  const seen = new Set<BookGenre>();
  for (const book of books) {
    seen.add(book.genre);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getAllMoods(books: readonly BookIndexEntry[] = BOOK_INDEX): BookMood[] {
  const seen = new Set<BookMood>();
  for (const book of books) {
    for (const mood of book.moods) {
      seen.add(mood);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'es'));
}

export function getCatalogBooks(): readonly BookIndexEntry[] {
  return BOOK_INDEX;
}

export function getBookById(bookId: string): BookIndexEntry | undefined {
  return BOOK_INDEX.find((book) => book.id === bookId);
}

/**
 * Motor escalable de consulta, filtrado y paginación sobre índices ligeros (+500 libros).
 * Opera sin cargar ningún archivo PDF completo en memoria.
 */
export function queryCatalog(
  books: readonly BookIndexEntry[],
  query: CatalogQuery = {},
): PaginatedCatalogResult {
  const normalizedSearch = query.search ? normalizeSearchText(query.search) : '';
  const genreFilter = query.genre && query.genre !== 'Todos' ? query.genre : null;
  const authorFilter = query.authorId && query.authorId !== 'Todos' ? query.authorId : null;
  const moodFilter = query.mood && query.mood !== 'Todos' ? query.mood : null;

  const filtered: BookIndexEntry[] = [];

  for (const book of books) {
    if (genreFilter && book.genre !== genreFilter) continue;
    if (authorFilter && book.authorId !== authorFilter) continue;
    if (moodFilter && !book.moods.includes(moodFilter)) continue;

    if (normalizedSearch.length > 0) {
      const haystack = normalizeSearchText(
        `${book.title} ${book.subtitle ?? ''} ${book.authorName} ${book.genre} ${book.moods.join(' ')} ${book.hookSummary}`,
      );
      if (!haystack.includes(normalizedSearch)) continue;
    }

    filtered.push(book);
  }

  const safePageSize = Math.max(1, Math.min(48, Math.floor(query.pageSize ?? 8)));
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.max(1, Math.min(totalPages, Math.floor(query.page ?? 1)));

  const startIndex = (safePage - 1) * safePageSize;
  const items = filtered.slice(startIndex, startIndex + safePageSize);

  return {
    items,
    totalItems,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

/**
 * Caché en memoria con límite LRU sencillo para metadatos o fragmentos leídos bajo demanda.
 */
export class BookPayloadCache<T> {
  private readonly store = new Map<string, T>();
  private readonly maxEntries: number;

  constructor(maxEntries = 32) {
    this.maxEntries = Math.max(4, maxEntries);
  }

  get(key: string): T | undefined {
    const value = this.store.get(key);
    if (value !== undefined) {
      // Refresh LRU order
      this.store.delete(key);
      this.store.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }
}
