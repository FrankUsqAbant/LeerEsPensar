import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BookPayloadCache,
  getCatalogBooks,
  normalizeSearchText,
  queryCatalog,
} from './catalogEngine';
import type { BookIndexEntry } from '../types/folio';

test('normalizeSearchText removes diacritics and normalizes case', () => {
  assert.equal(normalizeSearchText('  Pedro Páramo · Ficción '), 'pedro paramo · ficcion');
});

test('queryCatalog filters the 16 curated books by search, genre, mood, and author', () => {
  const books = getCatalogBooks();
  assert.equal(books.length, 16);

  const byAccentFreeSearch = queryCatalog(books, { search: 'paramo' });
  assert.equal(byAccentFreeSearch.totalItems, 1);
  assert.equal(byAccentFreeSearch.items[0].id, 'rulfo-pedro-paramo');

  const byGenre = queryCatalog(books, { genre: 'Novela clásica' });
  assert.equal(byGenre.totalItems, 3);

  const byMood = queryCatalog(books, { mood: 'Onírico' });
  assert.equal(byMood.totalItems, 5);

  const byAuthor = queryCatalog(books, { authorId: 'virginia-woolf' });
  assert.equal(byAuthor.totalItems, 1);
  assert.equal(byAuthor.items[0].title, 'Una habitación propia');
});

test('queryCatalog paginates cleanly across 500+ books', () => {
  const base = getCatalogBooks()[0];
  const largeCatalog: BookIndexEntry[] = Array.from({ length: 520 }, (_, index) => ({
    ...base,
    id: `book-${index + 1}`,
    slug: `book-${index + 1}`,
    title: `Obra de Archivo #${index + 1}`,
  }));

  const page1 = queryCatalog(largeCatalog, { page: 1, pageSize: 20 });
  assert.equal(page1.totalItems, 520);
  assert.equal(page1.totalPages, 26);
  assert.equal(page1.items.length, 20);
  assert.equal(page1.hasPreviousPage, false);
  assert.equal(page1.hasNextPage, true);

  const page26 = queryCatalog(largeCatalog, { page: 26, pageSize: 20 });
  assert.equal(page26.items.length, 20);
  assert.equal(page26.items[19].id, 'book-520');
  assert.equal(page26.hasNextPage, false);
});

test('BookPayloadCache evicts least recently used items cleanly', () => {
  const cache = new BookPayloadCache<string>(4);
  cache.set('a', '1');
  cache.set('b', '2');
  cache.set('c', '3');
  cache.set('d', '4');
  // Touch 'a' so 'b' becomes LRU
  assert.equal(cache.get('a'), '1');
  cache.set('e', '5');
  assert.equal(cache.has('b'), false);
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('e'), true);
});
