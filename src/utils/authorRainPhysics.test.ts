import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPreloaderWriterList,
  generateAuthorRainDrops,
  rainDrift,
  rainFallEase,
  rainOpacity,
  heroStartMs,
  preloaderMinMs,
  rainEndMs,
  RAIN_COUNT_DESKTOP,
  RAIN_COUNT_MOBILE,
  RAIN_FALL_SEC,
  RAIN_STAGGER_SEC,
} from './authorRainPhysics';

test('buildPreloaderWriterList includes catalog authors without duplicates', () => {
  const writers = buildPreloaderWriterList(18);
  assert.equal(writers.length, 18);
  assert.equal(new Set(writers).size, writers.length);
  assert.ok(writers.includes('Jorge Luis Borges'));
  assert.ok(writers.includes('Virginia Woolf'));
  assert.ok(writers.includes('Alejandra Pizarnik'));
});

test('generateAuthorRainDrops lets authors fall one by one, readable', () => {
  const writers = buildPreloaderWriterList(18);
  const drops = generateAuthorRainDrops(writers, 1440);

  assert.equal(drops.length, RAIN_COUNT_DESKTOP);
  drops.forEach((drop, i) => {
    assert.ok(drop.xPercent >= 18 && drop.xPercent <= 84, `xPercent out of bounds: ${drop.xPercent}`);
    assert.ok(Math.abs(drop.finalRotationDeg) <= 3.6, `rotation out of bounds: ${drop.finalRotationDeg}`);
    assert.equal(drop.durationSec, RAIN_FALL_SEC);
    assert.ok(Math.abs(drop.delaySec - i * RAIN_STAGGER_SEC) < 1e-9, 'one name at a time');
    assert.ok(drop.fontSizeRem >= 1.6, 'large enough to read');
    if (i > 0) {
      assert.ok(Math.abs(drop.xPercent - drops[i - 1].xPercent) >= 20, 'consecutive names fall apart');
    }
  });
});

test('generateAuthorRainDrops keeps mobile names centred and fewer', () => {
  const writers = buildPreloaderWriterList(18);
  const mobileDrops = generateAuthorRainDrops(writers, 390);
  assert.equal(mobileDrops.length, RAIN_COUNT_MOBILE);
  for (const drop of mobileDrops) {
    assert.ok(drop.xPercent >= 34 && drop.xPercent <= 66);
  }
});

test('hero appears only after the rain and the preloader waits for it', () => {
  assert.ok(heroStartMs(RAIN_COUNT_DESKTOP) < rainEndMs(RAIN_COUNT_DESKTOP));
  assert.ok(heroStartMs(RAIN_COUNT_DESKTOP) >= rainEndMs(RAIN_COUNT_DESKTOP) - 400);
  assert.ok(preloaderMinMs(RAIN_COUNT_DESKTOP) > heroStartMs(RAIN_COUNT_DESKTOP) + 1000);
});

test('rainFallEase falls gently and accelerates slightly and stays in [0, 1]', () => {
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
