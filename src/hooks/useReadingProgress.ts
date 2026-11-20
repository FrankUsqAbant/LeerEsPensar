import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReadingProgress, ReadingProgressMap } from "../types/folio";
import {
  READING_PROGRESS_STORAGE_KEY,
  loadProgressFromLocalStorage,
  markBookCompletedInMap,
  parseReadingProgressJson,
  recordPageProgress,
  removeBookProgressFromMap,
  saveProgressToLocalStorage,
} from "../utils/readingProgressStorage";

export interface ReadingSummaryStats {
  startedCount: number;
  completedCount: number;
  totalPagesRead: number;
}

export interface UseReadingProgressReturn {
  progressMap: ReadingProgressMap;
  stats: ReadingSummaryStats;
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  updatePage: (bookId: string, currentPage: number, totalPages: number) => void;
  markBookCompleted: (bookId: string, totalPages: number, completed?: boolean) => void;
  resetBookProgress: (bookId: string) => void;
  clearAllProgress: () => void;
}

export function useReadingProgress(): UseReadingProgressReturn {
  const [progressMap, setProgressMap] = useState<ReadingProgressMap>(() => {
    if (typeof window === "undefined") return {};
    return loadProgressFromLocalStorage(window.localStorage);
  });

  const progressMapRef = useRef<ReadingProgressMap>(progressMap);
  progressMapRef.current = progressMap;

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveProgressToLocalStorage(window.localStorage, progressMap);
  }, [progressMap]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === READING_PROGRESS_STORAGE_KEY) {
        setProgressMap(parseReadingProgressJson(event.newValue));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getBookProgress = useCallback(
    (bookId: string) => progressMap[bookId],
    [progressMap],
  );

  const updatePage = useCallback((bookId: string, currentPage: number, totalPages: number) => {
    setProgressMap(recordPageProgress(progressMapRef.current, bookId, currentPage, totalPages));
  }, []);

  const markBookCompleted = useCallback((bookId: string, totalPages: number, completed = true) => {
    setProgressMap(
      markBookCompletedInMap(progressMapRef.current, bookId, totalPages, completed),
    );
  }, []);

  const resetBookProgress = useCallback((bookId: string) => {
    setProgressMap(removeBookProgressFromMap(progressMapRef.current, bookId));
  }, []);

  const clearAllProgress = useCallback(() => {
    setProgressMap({});
  }, []);

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
    getBookProgress,
    updatePage,
    markBookCompleted,
    resetBookProgress,
    clearAllProgress,
  };
}
