import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeProgressPercentage,
  markBookCompletedInMap,
  mergeProgressMaps,
  parseReadingProgressJson,
  recordPageProgress,
  removeBookProgressFromMap,
} from './readingProgressStorage';

test('computeProgressPercentage clamps bounds and handles single-page books', () => {
  assert.equal(computeProgressPercentage(1, 100), 1);
  assert.equal(computeProgressPercentage(50, 100), 50);
  assert.equal(computeProgressPercentage(150, 100), 100);
  assert.equal(computeProgressPercentage(1, 1), 100);
  assert.equal(computeProgressPercentage(1, 0), 0);
});

test('recordPageProgress creates, updates, and auto-completes on final page', () => {
  const t1 = '2026-11-20T10:00:00.000Z';
  const t2 = '2026-11-20T10:05:00.000Z';

  let map = recordPageProgress({}, 'borges-ficciones', 44, 176, t1);
  assert.equal(map['borges-ficciones'].currentPage, 44);
  assert.equal(map['borges-ficciones'].percentage, 25);
  assert.equal(map['borges-ficciones'].completed, false);
  assert.equal(map['borges-ficciones'].startedAt, t1);

  map = recordPageProgress(map, 'borges-ficciones', 176, 176, t2);
  assert.equal(map['borges-ficciones'].completed, true);
  assert.equal(map['borges-ficciones'].percentage, 100);
  assert.equal(map['borges-ficciones'].startedAt, t1);
  assert.equal(map['borges-ficciones'].completedAt, t2);
});

test('markBookCompletedInMap toggles completion and removeBookProgressFromMap deletes entry', () => {
  let map = markBookCompletedInMap({}, 'rulfo-pedro-paramo', 132, true, '2026-11-20T11:00:00.000Z');
  assert.equal(map['rulfo-pedro-paramo'].completed, true);
  assert.equal(map['rulfo-pedro-paramo'].currentPage, 132);

  map = removeBookProgressFromMap(map, 'rulfo-pedro-paramo');
  assert.equal(map['rulfo-pedro-paramo'], undefined);
});

test('parseReadingProgressJson safely filters malformed records and clamps page overflow', () => {
  const raw = JSON.stringify({
    'camus-extranjero': {
      bookId: 'camus-extranjero',
      currentPage: 999,
      totalPages: 124,
      percentage: 100,
      completed: false,
      startedAt: '2026-11-20T09:00:00.000Z',
      lastReadAt: '2026-11-20T09:30:00.000Z',
    },
    corrupted: { invalid: true },
  });

  const parsed = parseReadingProgressJson(raw);
  assert.equal(Object.keys(parsed).length, 1);
  assert.equal(parsed['camus-extranjero'].currentPage, 124);
  assert.equal(parsed['camus-extranjero'].percentage, 100);
  assert.deepEqual(parseReadingProgressJson('{broken json'), {});
});

test('mergeProgressMaps combines local and cloud progress using highest page and completion', () => {
  const local = recordPageProgress(
    {},
    'borges-ficciones',
    88,
    176,
    '2026-11-20T12:00:00.000Z',
  );
  const cloudWithOlderPage = recordPageProgress(
    {},
    'borges-ficciones',
    30,
    176,
    '2026-11-20T10:00:00.000Z',
  );
  const cloudWithFinishedOther = markBookCompletedInMap(
    cloudWithOlderPage,
    'camus-extranjero',
    124,
    true,
    '2026-11-20T11:00:00.000Z',
  );

  const merged = mergeProgressMaps(local, cloudWithFinishedOther);
  assert.equal(merged['borges-ficciones'].currentPage, 88);
  assert.equal(merged['borges-ficciones'].percentage, 50);
  assert.equal(merged['borges-ficciones'].startedAt, '2026-11-20T10:00:00.000Z');
  assert.equal(merged['borges-ficciones'].lastReadAt, '2026-11-20T12:00:00.000Z');
  assert.equal(merged['camus-extranjero'].completed, true);
  assert.equal(merged['camus-extranjero'].percentage, 100);
});

