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

const opciones = { newestCount: 6, sectionSize: 10, resultsPerRow: 8, daySeed: 20261121 };

test('buildLibraryShelves pone TODOS los libros en alguna repisa, sin repetir (salvo recién llegados)', () => {
  const lib = fakeLibrary(40);
  const r = buildLibraryShelves(lib, sinFiltro, opciones);
  assert.equal(r.rows[0].label, 'Recién llegados');
  assert.equal(r.rows[0].slots.length, 6);
  // Los 5 más nuevos (agregado 2026-11-21) están en "Recién llegados".
  const nuevos = new Set(r.rows[0].slots.map((s) => s.book.id));
  for (let i = 35; i < 40; i += 1) assert.ok(nuevos.has(`libro-${i}`));
  // Las repisas por autor contienen los 40, cada uno una sola vez.
  const resto = r.rows.slice(1).flatMap((row) => row.slots.map((s) => s.book.id));
  assert.equal(resto.length, 40);
  assert.equal(new Set(resto).size, 40);
  assert.equal(r.shown, 40);
  assert.equal(r.hasMore, false);
  assert.ok(r.rows.slice(1).every((row) => row.label.startsWith('Autores')));
});

test('buildLibraryShelves no parte a un autor entre dos repisas y deja "Autor desconocido" al final', () => {
  const lib = [
    ...fakeLibrary(30),
    ...fakeLibrary(3).map((b, i) => ({ ...b, id: `anonimo-${i}`, authorName: 'Autor desconocido' })),
  ];
  const r = buildLibraryShelves(lib, sinFiltro, opciones);
  const porAutor = r.rows.slice(1);
  assert.equal(porAutor.at(-1)?.label, 'Autor desconocido');
  const repisaDe = new Map<string, Set<number>>();
  porAutor.forEach((row, i) => row.slots.forEach((s) => {
    repisaDe.set(s.book.authorName, (repisaDe.get(s.book.authorName) ?? new Set()).add(i));
  }));
  for (const [autor, repisas] of repisaDe) assert.equal(repisas.size, 1, `${autor} quedó en varias repisas`);
});

test('buildLibraryShelves con búsqueda o género devuelve solo resultados', () => {
  const lib = fakeLibrary(40);
  const busqueda = buildLibraryShelves(lib, { ...sinFiltro, search: 'paramo' }, opciones);
  assert.equal(busqueda.totalMatches, 1);
  assert.equal(busqueda.rows[0].label, 'Resultados');
  assert.equal(busqueda.rows[0].slots[0].book.title, 'Pedro Páramo');
  const genero = buildLibraryShelves(lib, { ...sinFiltro, genre: 'Ciencia' }, opciones);
  assert.equal(genero.totalMatches, 5);
  const muchos = buildLibraryShelves(lib, { ...sinFiltro, search: 'titulo' }, opciones);
  assert.deepEqual(muchos.rows.map((r) => r.label), ['Resultados', 'Más resultados', 'Más resultados', 'Más resultados', 'Más resultados']);
});

test('daySeedFor cambia de un día a otro', () => {
  assert.notEqual(daySeedFor(new Date(2026, 10, 21)), daySeedFor(new Date(2026, 10, 22)));
});

test('buildLibraryShelves abre con "Portadas destacadas" usando solo portadas reales vistosas', () => {
  const lib = fakeLibrary(40).map((b, i) => (i < 12 ? { ...b, coverImage: `/portada/${b.id}.webp`, coverScore: 60 + i * 3 } : b));
  const r = buildLibraryShelves(lib, sinFiltro, { ...opciones, featuredCount: 6, featuredMinScore: 70 });
  assert.equal(r.rows[0].label, 'Portadas destacadas');
  assert.equal(r.rows[0].slots.length, 6);
  assert.ok(r.rows[0].slots.every((s) => (s.book.coverScore ?? 0) >= 70));
  // Lo destacado no se repite en "Recién llegados".
  const destacados = new Set(r.rows[0].slots.map((s) => s.book.id));
  assert.ok(r.rows[1].slots.every((s) => !destacados.has(s.book.id)));
  // Sin suficientes portadas buenas (menos de 6), no aparece la repisa.
  const pocas = buildLibraryShelves(fakeLibrary(40), sinFiltro, { ...opciones, featuredCount: 6 });
  assert.equal(pocas.rows[0].label, 'Recién llegados');
});
