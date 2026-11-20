import type { ReadingProgress, ReadingProgressMap } from '../types/folio';

export const READING_PROGRESS_STORAGE_KEY = 'folio.reading-progress.v1';

export function computeProgressPercentage(currentPage: number, totalPages: number): number {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return 0;
  const clampedPage = Math.max(1, Math.min(totalPages, Math.floor(currentPage)));
  if (totalPages === 1) return 100;
  return Math.round((clampedPage / totalPages) * 100);
}

export function isValidProgressRecord(value: unknown): value is ReadingProgress {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ReadingProgress>;
  return (
    typeof item.bookId === 'string' &&
    item.bookId.length > 0 &&
    typeof item.currentPage === 'number' &&
    Number.isFinite(item.currentPage) &&
    item.currentPage >= 1 &&
    typeof item.totalPages === 'number' &&
    Number.isFinite(item.totalPages) &&
    item.totalPages >= 1 &&
    typeof item.percentage === 'number' &&
    Number.isFinite(item.percentage) &&
    typeof item.completed === 'boolean' &&
    typeof item.startedAt === 'string' &&
    typeof item.lastReadAt === 'string'
  );
}

export function parseReadingProgressJson(rawJson: string | null): ReadingProgressMap {
  if (!rawJson) return {};
  try {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const sanitized: ReadingProgressMap = {};
    for (const [bookId, record] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidProgressRecord(record) && record.bookId === bookId) {
        const clampedTotal = Math.max(1, Math.floor(record.totalPages));
        const clampedPage = Math.max(1, Math.min(clampedTotal, Math.floor(record.currentPage)));
        sanitized[bookId] = {
          ...record,
          currentPage: clampedPage,
          totalPages: clampedTotal,
          percentage: record.completed
            ? 100
            : computeProgressPercentage(clampedPage, clampedTotal),
        };
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

export function recordPageProgress(
  map: ReadingProgressMap,
  bookId: string,
  currentPage: number,
  totalPages: number,
  nowIso = new Date().toISOString(),
): ReadingProgressMap {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safePage = Math.max(1, Math.min(safeTotal, Math.floor(currentPage)));
  const existing = map[bookId];
  const reachedEnd = safePage >= safeTotal;
  const completed = Boolean(existing?.completed || reachedEnd);

  const nextEntry: ReadingProgress = {
    bookId,
    currentPage: safePage,
    totalPages: safeTotal,
    percentage: completed ? 100 : computeProgressPercentage(safePage, safeTotal),
    completed,
    startedAt: existing?.startedAt ?? nowIso,
    lastReadAt: nowIso,
    completedAt: completed ? (existing?.completedAt ?? nowIso) : undefined,
  };

  return {
    ...map,
    [bookId]: nextEntry,
  };
}

export function markBookCompletedInMap(
  map: ReadingProgressMap,
  bookId: string,
  totalPages: number,
  completed = true,
  nowIso = new Date().toISOString(),
): ReadingProgressMap {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const existing = map[bookId];
  const targetPage = completed
    ? safeTotal
    : Math.min(safeTotal, Math.max(1, existing?.currentPage ?? 1));

  const nextEntry: ReadingProgress = {
    bookId,
    currentPage: targetPage,
    totalPages: safeTotal,
    percentage: completed ? 100 : computeProgressPercentage(targetPage, safeTotal),
    completed,
    startedAt: existing?.startedAt ?? nowIso,
    lastReadAt: nowIso,
    completedAt: completed ? nowIso : undefined,
  };

  return {
    ...map,
    [bookId]: nextEntry,
  };
}

export function removeBookProgressFromMap(
  map: ReadingProgressMap,
  bookId: string,
): ReadingProgressMap {
  if (!(bookId in map)) return map;
  const next = { ...map };
  delete next[bookId];
  return next;
}

export function loadProgressFromLocalStorage(
  storage: Pick<Storage, 'getItem'> | null | undefined,
): ReadingProgressMap {
  if (!storage) return {};
  try {
    return parseReadingProgressJson(storage.getItem(READING_PROGRESS_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveProgressToLocalStorage(
  storage: Pick<Storage, 'setItem'> | null | undefined,
  map: ReadingProgressMap,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(READING_PROGRESS_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function mergeProgressMaps(
  localMap: ReadingProgressMap,
  cloudMap: ReadingProgressMap,
): ReadingProgressMap {
  const merged: ReadingProgressMap = {};
  const allIds = new Set([...Object.keys(localMap), ...Object.keys(cloudMap)]);

  for (const bookId of allIds) {
    const local = localMap[bookId];
    const cloud = cloudMap[bookId];

    if (local && !cloud) {
      merged[bookId] = local;
      continue;
    }
    if (!local && cloud) {
      merged[bookId] = cloud;
      continue;
    }
    if (!local || !cloud) continue;

    const totalPages = Math.max(1, Math.floor(Math.max(local.totalPages, cloud.totalPages)));
    const completed = Boolean(local.completed || cloud.completed);
    const highestPage = Math.max(
      1,
      Math.min(totalPages, Math.floor(Math.max(local.currentPage, cloud.currentPage))),
    );
    const currentPage = completed ? totalPages : highestPage;
    const percentage = completed ? 100 : computeProgressPercentage(currentPage, totalPages);

    const startedAt =
      new Date(local.startedAt).getTime() <= new Date(cloud.startedAt).getTime()
        ? local.startedAt
        : cloud.startedAt;
    const lastReadAt =
      new Date(local.lastReadAt).getTime() >= new Date(cloud.lastReadAt).getTime()
        ? local.lastReadAt
        : cloud.lastReadAt;

    merged[bookId] = {
      bookId,
      currentPage,
      totalPages,
      percentage,
      completed,
      startedAt,
      lastReadAt,
      completedAt: completed
        ? (local.completedAt ?? cloud.completedAt ?? lastReadAt)
        : undefined,
    };
  }

  return merged;
}

