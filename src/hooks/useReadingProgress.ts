import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUserReadingProgress,
  fetchUserReadingProgress,
  syncReadingProgressToCloud,
} from '../services/firestoreService';
import type { ReadingProgress, ReadingProgressMap } from '../types/folio';
import {
  READING_PROGRESS_STORAGE_KEY,
  loadProgressFromLocalStorage,
  markBookCompletedInMap,
  mergeProgressMaps,
  parseReadingProgressJson,
  recordPageProgress,
  removeBookProgressFromMap,
  saveProgressToLocalStorage,
} from '../utils/readingProgressStorage';

export interface ReadingSummaryStats {
  startedCount: number;
  completedCount: number;
  totalPagesRead: number;
}

export interface UseReadingProgressOptions {
  userId?: string | null;
  authReady?: boolean;
}

export interface UseReadingProgressReturn {
  progressMap: ReadingProgressMap;
  stats: ReadingSummaryStats;
  cloudSynced: boolean;
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  updatePage: (bookId: string, currentPage: number, totalPages: number) => void;
  markBookCompleted: (bookId: string, totalPages: number, completed?: boolean) => void;
  resetBookProgress: (bookId: string) => void;
  clearAllProgress: () => void;
}

export function useReadingProgress(
  options: UseReadingProgressOptions = {},
): UseReadingProgressReturn {
  const { userId = null, authReady = false } = options;

  const [progressMap, setProgressMap] = useState<ReadingProgressMap>(() => {
    if (typeof window === 'undefined') return {};
    return loadProgressFromLocalStorage(window.localStorage);
  });
  const [cloudSynced, setCloudSynced] = useState(false);

  const progressMapRef = useRef<ReadingProgressMap>(progressMap);
  progressMapRef.current = progressMap;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    saveProgressToLocalStorage(window.localStorage, progressMap);
  }, [progressMap]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === READING_PROGRESS_STORAGE_KEY) {
        setProgressMap(parseReadingProgressJson(event.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Hidrata y fusiona la bitácora desde Firestore cuando el usuario inicia sesión con Google
  useEffect(() => {
    if (!authReady || !userId) {
      setCloudSynced(false);
      return;
    }

    let active = true;
    const hydrateFromCloud = async () => {
      try {
        const cloudMap = await fetchUserReadingProgress(userId);
        if (!active) return;

        const localSnapshot = progressMapRef.current;
        const merged = mergeProgressMaps(localSnapshot, cloudMap);
        setProgressMap(merged);
        setCloudSynced(true);

        // Sube a la nube únicamente registros locales más avanzados o ausentes en Firestore
        const toUpload = Object.values(merged).filter((entry) => {
          const remote = cloudMap[entry.bookId];
          if (!remote) return true;
          return entry.currentPage > remote.currentPage || (entry.completed && !remote.completed);
        });
        await Promise.allSettled(
          toUpload.map((entry) => syncReadingProgressToCloud(userId, entry)),
        );
      } catch {
        if (active) setCloudSynced(false);
      }
    };

    void hydrateFromCloud();
    return () => {
      active = false;
    };
  }, [authReady, userId]);

  const getBookProgress = useCallback(
    (bookId: string) => progressMap[bookId],
    [progressMap],
  );

  const updatePage = useCallback(
    (bookId: string, currentPage: number, totalPages: number) => {
      const next = recordPageProgress(progressMapRef.current, bookId, currentPage, totalPages);
      setProgressMap(next);
      if (authReady && userId && next[bookId]) {
        void syncReadingProgressToCloud(userId, next[bookId]).catch(() => undefined);
      }
    },
    [authReady, userId],
  );

  const markBookCompleted = useCallback(
    (bookId: string, totalPages: number, completed = true) => {
      const next = markBookCompletedInMap(
        progressMapRef.current,
        bookId,
        totalPages,
        completed,
      );
      setProgressMap(next);
      if (authReady && userId && next[bookId]) {
        void syncReadingProgressToCloud(userId, next[bookId]).catch(() => undefined);
      }
    },
    [authReady, userId],
  );

  const resetBookProgress = useCallback(
    (bookId: string) => {
      const next = removeBookProgressFromMap(progressMapRef.current, bookId);
      setProgressMap(next);
      if (authReady && userId) {
        void deleteUserReadingProgress(userId, bookId).catch(() => undefined);
      }
    },
    [authReady, userId],
  );

  const clearAllProgress = useCallback(() => {
    const existingIds = Object.keys(progressMapRef.current);
    setProgressMap({});
    if (authReady && userId && existingIds.length > 0) {
      void Promise.allSettled(
        existingIds.map((id) => deleteUserReadingProgress(userId, id)),
      );
    }
  }, [authReady, userId]);

  const stats = useMemo<ReadingSummaryStats>(() => {
    const entries = Object.values(progressMap);
    let completedCount = 0;
    let totalPagesRead = 0;
    for (const item of entries) {
      if (item.completed) completedCount += 1;
      totalPagesRead += item.currentPage;
    }
    return {
      startedCount: entries.length,
      completedCount,
      totalPagesRead,
    };
  }, [progressMap]);

  return {
    progressMap,
    stats,
    cloudSynced,
    getBookProgress,
    updatePage,
    markBookCompleted,
    resetBookProgress,
    clearAllProgress,
  };
}
