import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreloaderWriterList,
  generateAuthorRainDrops,
} from './authorRainPhysics';

test('buildPreloaderWriterList includes catalog authors without duplicates', () => {
  const writers = buildPreloaderWriterList(18);
  assert.equal(writers.length, 18);
  assert.equal(new Set(writers).size, writers.length);
  assert.ok(writers.includes('Jorge Luis Borges'));
  assert.ok(writers.includes('Virginia Woolf'));
  assert.ok(writers.includes('Alejandra Pizarnik'));
});

test('generateAuthorRainDrops distributes bounded desktop drops into clean bottom layers', () => {
  const writers = buildPreloaderWriterList(18);
  const drops = generateAuthorRainDrops(writers, 1440);

  assert.equal(drops.length, 18);
  for (const drop of drops) {
    assert.ok(drop.xPercent >= 8 && drop.xPercent <= 92, `xPercent out of bounds: ${drop.xPercent}`);
    assert.ok(drop.stackBottomPx >= 14 && drop.stackBottomPx <= 140, `stackBottomPx out of bounds: ${drop.stackBottomPx}`);
    assert.ok(Math.abs(drop.finalRotationDeg) <= 7);
    assert.ok(drop.durationSec >= 1.0);
  }

  const layers = new Set(drops.map((d) => d.layer));
  assert.deepEqual(Array.from(layers).sort(), [0, 1, 2]);
});

test('generateAuthorRainDrops reduces density cleanly on mobile viewports without horizontal crowding', () => {
  const writers = buildPreloaderWriterList(18);
  const mobileDrops = generateAuthorRainDrops(writers, 390);
  assert.equal(mobileDrops.length, 8);
  for (const drop of mobileDrops) {
    assert.ok(drop.xPercent >= 20 && drop.xPercent <= 80);
  }

  for (let layer = 0; layer < 4; layer += 1) {
    const row = mobileDrops.filter((d) => d.layer === layer).sort((a, b) => a.xPercent - b.xPercent);
    assert.equal(row.length, 2);
    assert.ok(row[1].xPercent - row[0].xPercent >= 30, `Layer ${layer} too close: ${row[1].xPercent - row[0].xPercent}`);
  }
});
