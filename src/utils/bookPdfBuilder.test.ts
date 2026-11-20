import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalogBooks } from '../data/catalogEngine';
import {
  buildBookEditionPdfBytes,
  encodeWinAnsiStringLiteral,
  prepareVerifiedBookPdf,
  wrapTextToLines,
} from './bookPdfBuilder';
import { inspectPdfBytes } from './pdfSecurityValidator';

test('encodeWinAnsiStringLiteral escapes parentheses and preserves Spanish diacritics', () => {
  const encoded = encodeWinAnsiStringLiteral('Árbol (Comala) — ñ');
  assert.equal(encoded[0], 0x28); // '('
  assert.equal(encoded[encoded.length - 1], 0x29); // ')'
  // 'Á' in WinAnsi is 0xC1
  assert.equal(encoded[1], 0xc1);
  // 'ñ' in WinAnsi is 0xF1
  assert.equal(encoded[encoded.length - 2], 0xf1);
});

test('wrapTextToLines wraps long paragraphs cleanly within target line width', () => {
  const lines = wrapTextToLines(
    'Para pensar y escribir con libertad hace falta primero un espacio propio.',
    28,
  );
  assert.ok(lines.length >= 3);
  for (const line of lines) {
    assert.ok(line.length <= 28);
  }
});

test('buildBookEditionPdfBytes produces valid multi-page PDF 1.4 passing byte security inspection', () => {
  const books = getCatalogBooks();
  const woolf = books.find((b) => b.id === 'woolf-habitacion-propia');
  assert.ok(woolf);

  const bytes = buildBookEditionPdfBytes(woolf);
  const inspection = inspectPdfBytes(bytes, 'una-habitacion-propia.pdf', 'application/pdf');

  assert.equal(inspection.valid, true);
  assert.equal(inspection.pdfVersion, '1.4');
  assert.equal(inspection.hasEndOfFileMarker, true);
  assert.equal(inspection.containsActiveScripts, false);

  const rawAscii = new TextDecoder('latin1').decode(bytes);
  assert.ok(rawAscii.includes('/Count 2') || rawAscii.includes('/Count 3'));
  assert.ok(rawAscii.includes('Una habitaci'));
});

test('prepareVerifiedBookPdf builds and validates every book in the catalog', async () => {
  const books = getCatalogBooks();
  for (const book of books) {
    const prepared = await prepareVerifiedBookPdf(book, { skipPdfJsParsing: true });
    assert.equal(prepared.validation.valid, true);
    assert.ok(prepared.bytes.byteLength > 1500);
    assert.ok(prepared.fileName.endsWith('.pdf'));
  }
});
