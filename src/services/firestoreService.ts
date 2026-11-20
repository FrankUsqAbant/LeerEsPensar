import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  PdfValidationResult,
  ReadingProgress,
  ReadingProgressMap,
  Review,
  ReviewReactionTag,
} from '../types/folio';
import { REVIEW_CONSTRAINTS, sanitizePlainText } from '../utils/sanitization';

export async function ensureUserDocuments(user: User): Promise<void> {
  const publicRef = doc(db, 'users_public', user.uid);
  const privateRef = doc(db, 'users_private', user.uid);

  const safeDisplayName =
    sanitizePlainText(user.displayName ?? 'Lector de LeerEsPensar', 80) || 'Lector de LeerEsPensar';

  try {
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) {
      await setDoc(publicRef, {
        uid: user.uid,
        displayName: safeDisplayName,
        ...(user.photoURL ? { photoUrl: user.photoURL.slice(0, 512) } : {}),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users_public/${user.uid}`);
  }

  if (user.email) {
    try {
      const privateSnap = await getDoc(privateRef);
      if (!privateSnap.exists()) {
        await setDoc(privateRef, {
          uid: user.uid,
          email: user.email.slice(0, 254),
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users_private/${user.uid}`);
    }
  }
}

function buildProgressDocId(userId: string, bookId: string): string {
  return `${userId}_${bookId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export async function fetchUserReadingProgress(userId: string): Promise<ReadingProgressMap> {
  try {
    const q = query(
      collection(db, 'reading_progress'),
      where('userId', '==', userId),
      limit(100),
    );
    const snapshot = await getDocs(q);
    const map: ReadingProgressMap = {};
    for (const snap of snapshot.docs) {
      const data = snap.data();
      const bookId = typeof data.bookId === 'string' ? data.bookId : '';
      if (!bookId) continue;
      const totalPages =
        typeof data.totalPages === 'number' && Number.isFinite(data.totalPages)
          ? Math.min(20000, Math.max(1, Math.floor(data.totalPages)))
          : 1;
      const currentPage =
        typeof data.currentPage === 'number' && Number.isFinite(data.currentPage)
          ? Math.min(totalPages, Math.max(1, Math.floor(data.currentPage)))
          : 1;
      const completed = Boolean(data.completed);
      const percentage = completed
        ? 100
        : typeof data.percentage === 'number' && Number.isFinite(data.percentage)
          ? Math.min(100, Math.max(0, Math.round(data.percentage)))
          : Math.round((currentPage / totalPages) * 100);
      const startedAt = toIsoTimestamp(data.startedAt);
      const lastReadAt = toIsoTimestamp(data.lastReadAt);

      map[bookId] = {
        bookId,
        currentPage,
        totalPages,
        percentage,
        completed,
        startedAt,
        lastReadAt,
        completedAt: completed ? lastReadAt : undefined,
      };
    }
    return map;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `reading_progress?userId=${userId}`);
  }
}

export async function syncReadingProgressToCloud(
  userId: string,
  progress: ReadingProgress,
): Promise<void> {
  const safeBookId = sanitizePlainText(progress.bookId, 128).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeBookId) return;

  const docId = buildProgressDocId(userId, safeBookId);
  const ref = doc(db, 'reading_progress', docId);
  const safeTotal = Math.min(20000, Math.max(1, Math.floor(progress.totalPages)));
  const safePage = Math.min(safeTotal, Math.max(1, Math.floor(progress.currentPage)));
  const safePercentage = Math.min(100, Math.max(0, Number(progress.percentage) || 0));

  try {
    const existingSnap = await getDoc(ref);
    if (!existingSnap.exists()) {
      await setDoc(ref, {
        userId,
        bookId: safeBookId,
        currentPage: safePage,
        totalPages: safeTotal,
        percentage: safePercentage,
        completed: Boolean(progress.completed),
        startedAt: serverTimestamp(),
        lastReadAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        ref,
        {
          currentPage: safePage,
          totalPages: safeTotal,
          percentage: safePercentage,
          completed: Boolean(progress.completed),
          lastReadAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `reading_progress/${docId}`);
  }
}

export async function deleteUserReadingProgress(
  userId: string,
  bookId: string,
): Promise<void> {
  const safeBookId = sanitizePlainText(bookId, 128).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeBookId) return;
  const docId = buildProgressDocId(userId, safeBookId);
  const ref = doc(db, 'reading_progress', docId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `reading_progress/${docId}`);
  }
}

export async function submitPdfSecurityReport(
  reporterId: string,
  validation: PdfValidationResult,
  bookId?: string,
): Promise<string> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ref = doc(db, 'security_reports', reportId);

  try {
    await setDoc(ref, {
      reporterId,
      ...(bookId ? { bookId: sanitizePlainText(bookId, 128) } : {}),
      fileName: sanitizePlainText(validation.details.fileName, 180) || 'archivo.pdf',
      errorCode: sanitizePlainText(validation.errorCode ?? 'CORRUPTED_STRUCTURE', 64),
      details: sanitizePlainText(
        validation.technicalReason ?? validation.userMessage,
        500,
      ),
      createdAt: serverTimestamp(),
    });
    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `security_reports/${reportId}`);
  }
}

function toIsoTimestamp(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export async function fetchBookReviews(bookId: string): Promise<Review[]> {
  const safeBookId = sanitizePlainText(bookId, 128).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeBookId) return [];

  try {
    const q = query(
      collection(db, 'reviews'),
      where('bookId', '==', safeBookId),
      limit(30),
    );
    const snapshot = await getDocs(q);
    const items: Review[] = snapshot.docs.map((snap) => {
      const data = snap.data();
      const ratingNum = typeof data.rating === 'number' ? Math.round(data.rating) : 5;
      const clampedRating = Math.min(5, Math.max(1, ratingNum)) as Review['rating'];
      const tags = Array.isArray(data.reactionTags)
        ? data.reactionTags
            .filter((tag): tag is ReviewReactionTag => typeof tag === 'string')
            .slice(0, REVIEW_CONSTRAINTS.maxReactionTags)
        : [];

      return {
        id: typeof data.id === 'string' ? data.id : snap.id,
        bookId: safeBookId,
        authorId: typeof data.authorId === 'string' ? data.authorId : 'anon',
        authorName: sanitizePlainText(String(data.authorName ?? 'Lector'), 80),
        content: sanitizePlainText(String(data.content ?? ''), 1200),
        rating: clampedRating,
        reactionTags: tags,
        createdAt: toIsoTimestamp(data.createdAt),
      };
    });

    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `reviews?bookId=${safeBookId}`);
  }
}

export async function publishBookReview(input: {
  bookId: string;
  authorId: string;
  authorName: string;
  content: string;
  rating: Review['rating'];
  reactionTags: ReviewReactionTag[];
}): Promise<Review> {
  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const safeBookId = sanitizePlainText(input.bookId, 128).replace(/[^a-zA-Z0-9_-]/g, '');
  const safeAuthorName = sanitizePlainText(
    input.authorName,
    REVIEW_CONSTRAINTS.authorNameMaxLength,
  );
  const safeContent = sanitizePlainText(
    input.content,
    REVIEW_CONSTRAINTS.contentMaxLength,
  );
  const safeTags = input.reactionTags
    .map((tag) => sanitizePlainText(tag, 64) as ReviewReactionTag)
    .slice(0, REVIEW_CONSTRAINTS.maxReactionTags);
  const safeRating = Math.min(5, Math.max(1, Math.round(input.rating))) as Review['rating'];

  const ref = doc(db, 'reviews', reviewId);
  try {
    await setDoc(ref, {
      id: reviewId,
      bookId: safeBookId,
      authorId: input.authorId,
      authorName: safeAuthorName,
      content: safeContent,
      rating: safeRating,
      reactionTags: safeTags,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
  }

  return {
    id: reviewId,
    bookId: safeBookId,
    authorId: input.authorId,
    authorName: safeAuthorName,
    content: safeContent,
    rating: safeRating,
    reactionTags: safeTags,
    createdAt: new Date().toISOString(),
  };
}

