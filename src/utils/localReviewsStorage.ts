import type { Review } from '../types/folio';

const LOCAL_REVIEWS_KEY = 'leerespensar_local_reviews_v1';

export function readLocalReviewsForBook(bookId: string): Review[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Review =>
        Boolean(item) &&
        typeof item === 'object' &&
        (item as Review).bookId === bookId &&
        typeof (item as Review).content === 'string',
    );
  } catch {
    return [];
  }
}

export function saveLocalReview(review: Review): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LOCAL_REVIEWS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const existing = Array.isArray(parsed) ? (parsed as Review[]) : [];
    const next = [review, ...existing.filter((item) => item.id !== review.id)].slice(0, 60);
    window.localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(next));
  } catch {
    // Silencioso si localStorage no está disponible.
  }
}
