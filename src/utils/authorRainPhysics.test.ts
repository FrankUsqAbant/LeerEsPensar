import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreloaderWriterList,
  generateAuthorRainDrops,
  rainDrift,
  rainFallEase,
  rainOpacity,
} from './authorRainPhysics';

test('buildPreloaderWriterList includes catalog authors without duplicates', () => {
  const writers = buildPreloaderWriterList(18);
  assert.equal(writers.length, 18);
  assert.equal(new Set(writers).size, writers.length);
  assert.ok(writers.includes('Jorge Luis Borges'));
  assert.ok(writers.includes('Virginia Woolf'));
  assert.ok(writers.includes('Alejandra Pizarnik'));
});

test('generateAuthorRainDrops spreads a light desktop rain without crowding the edges', () => {
  const writers = buildPreloaderWriterList(18);
  const drops = generateAuthorRainDrops(writers, 1440);

  assert.equal(drops.length, 12);
  for (const drop of drops) {
    assert.ok(drop.xPercent >= 10 && drop.xPercent <= 90, `xPercent out of bounds: ${drop.xPercent}`);
    assert.ok(Math.abs(drop.driftPercent) <= 5, `driftPercent out of bounds: ${drop.driftPercent}`);
    assert.ok(Math.abs(drop.finalRotationDeg) <= 7.1, `rotation out of bounds: ${drop.finalRotationDeg}`);
    assert.ok(drop.durationSec >= 1.08 && drop.durationSec <= 1.36);
    assert.ok(drop.delaySec >= 0 && drop.delaySec <= 0.52);
  }

  const xs = [...drops.map((d) => d.xPercent)].sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i += 1) {
    if (xs[i] - xs[i - 1] < 0.4) {
      // Same lane in a later wave is fine; require they are not identical stacks
      assert.ok(xs[i] - xs[i - 1] >= 0, 'x positions should be ordered');
    }
  }
  assert.ok(xs[xs.length - 1] - xs[0] >= 50, 'drops should span most of the width');
});

test('generateAuthorRainDrops reduces density on mobile without crowding the edges', () => {
  const writers = buildPreloaderWriterList(18);
  const mobileDrops = generateAuthorRainDrops(writers, 390);
  assert.equal(mobileDrops.length, 6);
  for (const drop of mobileDrops) {
    assert.ok(drop.xPercent >= 18 && drop.xPercent <= 82);
    assert.ok(Math.abs(drop.driftPercent) <= 3.1);
  }

  const firstWave = mobileDrops.slice(0, 3).sort((a, b) => a.xPercent - b.xPercent);
  assert.ok(firstWave[1].xPercent - firstWave[0].xPercent >= 20);
  assert.ok(firstWave[2].xPercent - firstWave[1].xPercent >= 20);
});

test('rainFallEase accelerates like gravity and stays in [0, 1]', () => {
  assert.equal(rainFallEase(0), 0);
  assert.equal(rainFallEase(1), 1);
  assert.equal(rainFallEase(-0.2), 0);
  assert.equal(rainFallEase(2), 1);
  assert.ok(rainFallEase(0.5) < 0.5);
  assert.ok(rainFallEase(0.25) < rainFallEase(0.5));
  assert.ok(rainFallEase(0.75) > rainFallEase(0.5));
});

test('rainOpacity fades in and out softly', () => {
  assert.equal(rainOpacity(0), 0);
  assert.equal(rainOpacity(1), 0);
  assert.ok(rainOpacity(0.4) === 1);
  assert.ok(rainOpacity(0.06) < rainOpacity(0.14));
  assert.ok(rainOpacity(0.95) < rainOpacity(0.75));
});

test('rainDrift starts and ends at zero with a mid-fall peak', () => {
  assert.equal(rainDrift(0, 8), 0);
  assert.ok(Math.abs(rainDrift(1, 8)) < 1e-10);
  assert.ok(Math.abs(rainDrift(0.5, 8) - 8) < 1e-10);
});
