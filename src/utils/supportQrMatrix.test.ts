import test from 'node:test';
import assert from 'node:assert/strict';
import { getSupportConfig, normalizePhoneDigits } from '../config/support';
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

test('getSupportConfig does not invent a phone number or donation URLs', () => {
  const config = getSupportConfig();
  assert.equal(config.yapeAvailable, false);
  assert.equal(config.yapePhoneDigits, '');
  assert.equal(config.yapePhoneDisplay, '');
  assert.equal(config.plinAvailable, false);
  assert.equal(config.plinPhoneDigits, '');
  assert.equal(config.paypalUrl, '');
  assert.equal(config.kofiUrl, '');
  assert.equal(config.bmcUrl, '');
});

test('normalizePhoneDigits strips spaces and keeps the country code', () => {
  assert.equal(normalizePhoneDigits('+51 987 654 321'), '+51987654321');
});
