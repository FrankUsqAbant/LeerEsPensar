import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCIAL_URL, displayUrl, getPaypalUrl } from '../config/support';
import { generateQrMatrix } from './supportQrMatrix';

test('generateQrMatrix produces square ISO QR matrix with intact finder patterns', () => {
  const matrix = generateQrMatrix('YAPE:PE:987654321:LeerEsPensar');
  const size = matrix.length;
  assert.ok(size === 25 || size === 29 || size === 33);
  for (const row of matrix) {
    assert.equal(row.length, size);
  }

  // Top-left 7x7 finder corners & center must be dark
  assert.equal(matrix[0][0], true);
  assert.equal(matrix[0][6], true);
  assert.equal(matrix[6][0], true);
  assert.equal(matrix[3][3], true);
  // Inner ring of finder must be light
  assert.equal(matrix[1][1], false);

  // Top-right & bottom-left centers must also be dark
  assert.equal(matrix[3][size - 4], true);
  assert.equal(matrix[size - 4][3], true);
});

test('generateQrMatrix is deterministic for identical payload', () => {
  const first = generateQrMatrix('YAPE:PE:987654321:LeerEsPensar');
  const second = generateQrMatrix('YAPE:PE:987654321:LeerEsPensar');
  assert.deepEqual(first, second);
});

test('el QR de redes cabe completo en el generador (no se recorta el enlace)', () => {
  // Capacidad máxima del generador: versión 4 (33 módulos, 78 bytes).
  assert.ok(new TextEncoder().encode(SOCIAL_URL).length <= 78);
  const matrix = generateQrMatrix(SOCIAL_URL);
  assert.ok(matrix.length <= 33);
});

test('PayPal usa un enlace https seguro y el texto visible omite el protocolo', () => {
  assert.match(getPaypalUrl(), /^https:\/\/paypal\.me\//);
  assert.equal(displayUrl('https://frankusqabant.github.io/'), 'frankusqabant.github.io');
});
