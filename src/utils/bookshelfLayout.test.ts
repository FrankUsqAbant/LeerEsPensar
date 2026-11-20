import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalogBooks } from '../data/catalogEngine';
import {
  buildSlidingShelves,
  computeBookHeightPx,
  computeBookshelfLayout,
  computePhysicalBookStyle,
  filterBooksForShelf,
} from './bookshelfLayout';

test('filterBooksForShelf returns all 16 books without filter and narrows cleanly by genre and author', () => {
  const books = getCatalogBooks();
  assert.equal(books.length, 16);

  const allBooks = filterBooksForShelf(books, {
    search: '',
    genre: 'Todos',
    authorId: 'Todos',
  });
  assert.equal(allBooks.length, 16);

  const gothicBooks = filterBooksForShelf(books, {
    search: '',
    genre: 'Novela gótica',
    authorId: 'Todos',
  });
  assert.equal(gothicBooks.length, 2);
  assert.deepEqual(
    gothicBooks.map((b) => b.id),
    ['wilde-dorian-gray', 'shelley-frankenstein'],
  );

  const cervantesBooks = filterBooksForShelf(books, {
    search: '',
    genre: 'Todos',
    authorId: 'miguel-de-cervantes',
  });
  assert.equal(cervantesBooks.length, 1);
  assert.equal(cervantesBooks[0].title, 'Don Quijote de la Mancha');
});

test('buildSlidingShelves splits 16 unfiltered books into 3 balanced horizontal shelves and focuses <=6 filtered books on 1 shelf', () => {
  const books = getCatalogBooks();

  const fullShelves = buildSlidingShelves(books, {
    search: '',
    genre: 'Todos',
    authorId: 'Todos',
  });
  assert.equal(fullShelves.hasActiveFilter, false);
  assert.equal(fullShelves.rows.length, 2);
  assert.equal(fullShelves.rows[0].slots.length, 8);
  assert.equal(fullShelves.rows[1].slots.length, 8);

  const classicShelf = buildSlidingShelves(books, {
    search: '',
    genre: 'Novela clásica',
    authorId: 'Todos',
  });
  assert.equal(classicShelf.hasActiveFilter, true);
  assert.equal(classicShelf.totalMatches, 3);
  assert.equal(classicShelf.rows.length, 1);
  assert.equal(classicShelf.rows[0].slots.length, 3);

  const emptyShelf = buildSlidingShelves(books, {
    search: 'titulo inexistente xyz',
    genre: 'Todos',
    authorId: 'Todos',
  });
  assert.equal(emptyShelf.totalMatches, 0);
  assert.equal(emptyShelf.rows.length, 0);
});

test('computeBookshelfLayout supports accent-insensitive search across shelves', () => {
  const books = getCatalogBooks();
  const layout = computeBookshelfLayout(
    books,
    { search: 'pizarnik', genre: 'Todos', authorId: 'Todos' },
    4,
  );

  assert.equal(layout.totalMatches, 1);
  assert.equal(layout.matchedIds.has('pizarnik-arbol-de-diana'), true);
  assert.equal(layout.firstMatchedRowIndex, 1);
});

test('computeBookHeightPx bounds heights cleanly', () => {
  assert.equal(computeBookHeightPx(60), 128);
  assert.equal(computeBookHeightPx(240), 144);
  assert.equal(computeBookHeightPx(999), 144);
});

test('computePhysicalBookStyle scales cream page thickness and sets natural stances', () => {
  const thin = computePhysicalBookStyle(60, 0, 0);
  const thick = computePhysicalBookStyle(240, 0, 2);

  assert.equal(thin.stance, 'frontal');
  assert.equal(thin.pageBlockWidthPx, 5);
  assert.equal(thick.stance, 'angled');
  assert.equal(thick.pageBlockWidthPx, 9);
  assert.equal(thick.spineWidthPx, 12);
});
