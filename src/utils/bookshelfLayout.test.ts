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

// --- Biblioteca grande: estante por partes ---
import { buildLibraryShelves, daySeedFor } from './bookshelfLayout';
import { toBook } from '../data/library';

function fakeLibrary(n: number) {
  return Array.from({ length: n }, (_, i) =>
    toBook({
      id: `libro-${i}`,
      titulo: i === 7 ? 'Pedro Páramo' : `Título ${i}`,
      autor: i % 2 ? 'Juan Rulfo' : 'Otra Autora',
      anio: null,
      paginas: 100 + i,
      bytes: 1000,
      genero: i < 5 ? 'Ciencia' : 'Sin clasificar',
      clave: `libros/libro-${i}.pdf`,
      agregado: i >= 35 ? '2026-11-21' : '2026-11-20',
    }),
  );
}
const sinFiltro = { search: '', genre: 'Todos' as const, authorId: 'Todos' as const };

const opciones = { daySeed: 20261121, featuredCount: 6, featuredMinScore: 70 };

const conPortadas = () =>
  fakeLibrary(40).map((b, i) => (i < 12 ? { ...b, coverImage: `/portada/${b.id}.webp`, coverScore: 60 + i * 3 } : b));

test('buildLibraryShelves arma solo dos repisas: destacadas y toda la biblioteca', () => {
  const r = buildLibraryShelves(conPortadas(), sinFiltro, opciones);
  assert.deepEqual(r.rows.map((x) => x.label), ['Portadas destacadas', 'Toda la biblioteca, de la A a la Z']);
  // Destacadas: solo portadas reales >= 70, sin repetir.
  assert.ok(r.rows[0].slots.every((s) => (s.book.coverScore ?? 0) >= 70));
  assert.equal(r.rows[0].slots.length, 8);
  // La segunda repisa tiene TODOS los libros, una vez cada uno.
  const todos = r.rows[1].slots.map((s) => s.book.id);
  assert.equal(todos.length, 40);
  assert.equal(new Set(todos).size, 40);
  assert.equal(r.hasMore, false);
});

test('buildLibraryShelves deja "Autor desconocido" al final de la A a la Z', () => {
  const lib = [
    ...fakeLibrary(10).map((b, i) => (i < 2 ? { ...b, id: `anon-${i}`, authorName: 'Autor desconocido' } : b)),
  ];
  const fila = buildLibraryShelves(lib, sinFiltro, opciones).rows.at(-1)!;
  assert.deepEqual(fila.slots.slice(-2).map((s) => s.book.authorName), ['Autor desconocido', 'Autor desconocido']);
});

test('sin suficientes portadas buenas solo queda la repisa de la A a la Z', () => {
  const r = buildLibraryShelves(fakeLibrary(40), sinFiltro, opciones);
  assert.deepEqual(r.rows.map((x) => x.label), ['Toda la biblioteca, de la A a la Z']);
});

test('con búsqueda, los resultados se reparten en dos repisas', () => {
  const lib = fakeLibrary(40);
  const busqueda = buildLibraryShelves(lib, { ...sinFiltro, search: 'paramo' }, opciones);
  assert.equal(busqueda.totalMatches, 1);
  assert.deepEqual(busqueda.rows.map((x) => x.label), ['Resultados']);
  assert.equal(busqueda.rows[0].slots[0].book.title, 'Pedro Páramo');
  const muchos = buildLibraryShelves(lib, { ...sinFiltro, search: 'titulo' }, opciones);
  assert.deepEqual(muchos.rows.map((x) => x.label), ['Resultados', 'Más resultados']);
  assert.equal(muchos.rows[0].slots.length + muchos.rows[1].slots.length, muchos.totalMatches);
});

test('daySeedFor cambia de un día a otro', () => {
  assert.notEqual(daySeedFor(new Date(2026, 10, 21)), daySeedFor(new Date(2026, 10, 22)));
});
