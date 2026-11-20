import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalogBooks } from '../data/catalogEngine';
import { buildShareCaption, shareCardFileName } from './bookShareCard';

const books = getCatalogBooks();
const book = books.find((b) => b.slug.includes('pedro-paramo')) ?? books[0];

test('el texto para Facebook incluye libro, frase, enlace y hashtags legibles', () => {
  const caption = buildShareCaption(book, 'https://ejemplo.pages.dev/');
  assert.match(caption, new RegExp(`«${book.title}», de ${book.authorName}`));
  assert.ok(caption.includes('https://ejemplo.pages.dev/'));
  assert.ok(caption.includes('#LeerEsPensar'));
  // "Realismo mágico" → "#RealismoMágico": sin espacios y con tildes.
  const genreTag = `#${book.genre.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join('')}`;
  assert.ok(caption.includes(genreTag), `falta ${genreTag}`);
  // La última línea son solo hashtags: cada palabra empieza con "#" (ninguno quedó partido).
  const tags = (caption.split('\n').at(-1) ?? '').split(' ');
  assert.equal(tags.length, 3);
  assert.ok(tags.every((tag) => tag.startsWith('#') && tag.length > 1));
});

test('el archivo de la tarjeta usa el slug del libro', () => {
  assert.equal(shareCardFileName(book), `${book.slug}-LeerEsPensar.png`);
});
