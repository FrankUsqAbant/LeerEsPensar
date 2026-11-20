import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtmlEntities,
  isSafeHttpUrl,
  sanitizePlainText,
  validateAndSanitizeReview,
} from './sanitization';

test('sanitizePlainText strips HTML tags, control chars, and script protocols', () => {
  const dirty = '<script>alert(1)</script> Excelente lectura javascript:void(0)  \u0007';
  const clean = sanitizePlainText(dirty);
  assert.equal(clean, 'alert(1) Excelente lectura void(0)');
});

test('escapeHtmlEntities escapes special HTML characters', () => {
  assert.equal(escapeHtmlEntities('<b class="x">A & B</b>'), '&lt;b class=&quot;x&quot;&gt;A &amp; B&lt;/b&gt;');
});

test('validateAndSanitizeReview rejects empty names, short text, and spam repetition', () => {
  const shortRes = validateAndSanitizeReview('Ana', 'corto', 1);
  assert.equal(shortRes.ok, false);

  const spamRes = validateAndSanitizeReview('Ana', 'aaaaaaaaaaaa', 1);
  assert.equal(spamRes.ok, false);

  const tooManyTags = validateAndSanitizeReview('Ana', 'Una obra luminosa y profunda.', 4);
  assert.equal(tooManyTags.ok, false);

  const validRes = validateAndSanitizeReview('<b>Ana</b>', 'Una lectura inolvidable que transforma la mirada.', 2);
  assert.equal(validRes.ok, true);
  assert.equal(validRes.sanitizedAuthorName, 'Ana');
});

test('isSafeHttpUrl allows http/https and rejects javascript/data URLs', () => {
  assert.equal(isSafeHttpUrl('https://folio.lectura.org/libro'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,<h1>x</h1>'), false);
});
