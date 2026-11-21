import test from 'node:test';
import assert from 'node:assert/strict';
import { GRATITUDE_PHRASES, formatGratitudeName, gratitudePhrase } from './gratitud';

test('el muro guarda solo primer nombre e inicial del apellido', () => {
  assert.equal(formatGratitudeName('  maría josé ', 'gonzález pérez'), 'María G.');
  assert.equal(formatGratitudeName('ÑUFLO', 'ñahui'), 'Ñuflo Ñ.');
  assert.equal(formatGratitudeName("D'Arcy", 'o’neil'), "D'arcy O.");
  assert.equal(formatGratitudeName('ana-lucía', 'Ríos'), 'Ana-Lucía R.');
});

test('rechaza lo que no parece un nombre', () => {
  assert.equal(formatGratitudeName('', 'Pérez'), null);
  assert.equal(formatGratitudeName('María', ''), null);
  assert.equal(formatGratitudeName('M4ría', 'Pérez'), null);
  assert.equal(formatGratitudeName('<script>', 'x'), null);
  assert.equal(formatGratitudeName('http://spam', 'x'), null);
  assert.equal(formatGratitudeName('A'.repeat(21), 'Pérez'), null);
});

test('la frase de agradecimiento usa el primer nombre', () => {
  const frase = gratitudePhrase('María G.', 0);
  assert.ok(frase.includes('María'));
  assert.ok(!frase.includes('{nombre}'));
  assert.ok(GRATITUDE_PHRASES.every((f) => f.includes('{nombre}')));
});
