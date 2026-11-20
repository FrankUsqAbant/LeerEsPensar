import { useEffect, useState } from 'react';
import { MessageSquarePlus, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchBookReviews, publishBookReview } from '../services/firestoreService';
import type { BookIndexEntry, Review, ReviewReactionTag } from '../types/folio';
import { readLocalReviewsForBook, saveLocalReview } from '../utils/localReviewsStorage';
import {
  REVIEW_CONSTRAINTS,
  sanitizePlainText,
  validateAndSanitizeReview,
} from '../utils/sanitization';

const EDITORIAL_REACTION_TAGS: ReviewReactionTag[] = [
  'Me cambió la perspectiva',
  'Lectura imprescindible',
  'Prosa hipnótica',
  'Ideal para una tarde de lluvia',
  'Breve pero inolvidable',
];

export interface BookCommunityProps {
  book: BookIndexEntry;
  surfaceMode?: 'light' | 'sepia' | 'night';
}

export function BookCommunity({ book, surfaceMode = 'light' }: BookCommunityProps) {
  const { user, signInWithGoogle, signingIn } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);

  const [authorName, setAuthorName] = useState(user?.displayName ?? '');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState<Review['rating']>(5);
  const [selectedTags, setSelectedTags] = useState<ReviewReactionTag[]>([
    'Lectura imprescindible',
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.displayName && !authorName) {
      setAuthorName(user.displayName);
    }
  }, [user?.displayName, authorName]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadNotice(null);
      const localItems = readLocalReviewsForBook(book.id);
      try {
        const cloudItems = await fetchBookReviews(book.id);
        if (!active) return;
        const merged = [...cloudItems];
        for (const local of localItems) {
          if (!merged.some((item) => item.id === local.id)) {
            merged.push(local);
          }
        }
        setReviews(merged);
      } catch {
        if (!active) return;
        setReviews(localItems);
        setLoadNotice(
          'Mostrando reseñas guardadas en este navegador. Conecta tu sesión para sincronizar con la comunidad.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [book.id]);

  const toggleReactionTag = (tag: ReviewReactionTag) => {
    setFormError(null);
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      if (prev.length >= REVIEW_CONSTRAINTS.maxReactionTags) {
        setFormError(
          `Puedes elegir hasta ${REVIEW_CONSTRAINTS.maxReactionTags} impresiones editoriales.`,
        );
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitNotice(null);

    const effectiveName = authorName.trim() || user?.displayName || '';
    const validation = validateAndSanitizeReview(
      effectiveName,
      content,
      selectedTags.length,
    );

    if (!validation.ok) {
      setFormError(validation.errorMessage ?? 'Revisa los datos de tu reseña.');
      return;
    }

    setSubmitting(true);
    try {
      if (user) {
        const created = await publishBookReview({
          bookId: book.id,
          authorId: user.uid,
          authorName: validation.sanitizedAuthorName,
          content: validation.sanitizedContent,
          rating,
          reactionTags: selectedTags,
        });
        setReviews((prev) => [created, ...prev]);
        setContent('');
        setSubmitNotice('Tu reseña quedó publicada en la comunidad de LeerEsPensar.');
      } else {
        const localReview: Review = {
          id: `local_${Date.now()}`,
          bookId: book.id,
          authorId: 'local-reader',
          authorName: validation.sanitizedAuthorName,
          content: validation.sanitizedContent,
          rating,
          reactionTags: selectedTags,
          createdAt: new Date().toISOString(),
        };
        saveLocalReview(localReview);
        setReviews((prev) => [localReview, ...prev]);
        setContent('');
        setSubmitNotice(
          'Reseña guardada en tu navegador. Inicia sesión con Google para compartirla con toda la comunidad.',
        );
      }
    } catch {
      setFormError(
        'No se pudo publicar en la nube en este momento. Inténtalo de nuevo o guarda tu nota tras revisar tu conexión.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isNight = surfaceMode === 'night';
  const cardSurface = isNight
    ? 'bg-[#22201D] border-[#38342E] text-[#F3EFE8]'
    : 'bg-[#F3EFE8] border-[#E6DFD3] text-[#1A1917]';
  const inputSurface = isNight
    ? 'bg-[#171614] border-[#38342E] text-[#F3EFE8] placeholder:text-[#9D968B]'
    : 'bg-[#FAF8F5] border-[#E6DFD3] text-[#1A1917] placeholder:text-[#6B665E]';
  const mutedText = isNight ? 'text-[#B5AEA3]' : 'text-[#6B665E]';

  return (
    <section
      aria-label={`Comunidad de lectura sobre ${book.title}`}
      data-testid="book-community-section"
      className="space-y-6 pt-8 border-t border-current/15"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#4A5D4E] inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Comunidad de lectura · Reseñas sanitizadas
          </p>
          <h3 className="font-serif text-2xl font-medium mt-1">
            Voces de quienes leyeron «{book.title}»
          </h3>
        </div>
        <span className={`text-xs tabular-nums ${mutedText}`}>
          {reviews.length} {reviews.length === 1 ? 'comentario' : 'comentarios'}
        </span>
      </div>

      {/* Formulario editorial de reseña */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={`rounded-xl border p-5 space-y-4 ${cardSurface}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7">
            <label htmlFor="review-author-name" className="block text-xs font-medium mb-1">
              Tu nombre o firma de lector
            </label>
            <input
              id="review-author-name"
              type="text"
              maxLength={REVIEW_CONSTRAINTS.authorNameMaxLength}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ej. Valeria Mendoza"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 ${inputSurface}`}
            />
          </div>

          <div className="sm:col-span-5">
            <span className="block text-xs font-medium mb-1">Valoración</span>
            <div className="flex items-center gap-1.5 py-1.5" role="radiogroup" aria-label="Valoración de 1 a 5 estrellas">
              {([1, 2, 3, 4, 5] as const).map((starValue) => (
                <button
                  key={starValue}
                  type="button"
                  role="radio"
                  aria-checked={rating === starValue}
                  aria-label={`${starValue} ${starValue === 1 ? 'estrella' : 'estrellas'}`}
                  onClick={() => setRating(starValue)}
                  className="p-1 rounded hover:scale-105 transition-transform"
                >
                  <Star
                    className={`w-5 h-5 ${
                      starValue <= rating
                        ? 'fill-[#D97757] text-[#D97757]'
                        : isNight
                          ? 'text-[#5C574F]'
                          : 'text-[#C9C1B4]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium mb-2">
            Impresión editorial (elige hasta {REVIEW_CONSTRAINTS.maxReactionTags})
          </span>
          <div className="flex flex-wrap gap-2">
            {EDITORIAL_REACTION_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleReactionTag(tag)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    active
                      ? 'bg-[#4A5D4E] text-[#FAF8F5] border-[#4A5D4E]'
                      : isNight
                        ? 'bg-[#171614] text-[#D9D2C7] border-[#38342E] hover:border-[#6B665E]'
                        : 'bg-[#FAF8F5] text-[#1A1917] border-[#E6DFD3] hover:border-[#B45335]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="review-content" className="block text-xs font-medium mb-1">
            ¿Qué te dejó esta lectura?
          </label>
          <textarea
            id="review-content"
            rows={3}
            maxLength={REVIEW_CONSTRAINTS.contentMaxLength}
            value={content}
            onChange={(e) => {
              setFormError(null);
              setContent(e.target.value);
            }}
            placeholder="Comparte una frase, idea o sensación sobre el libro (mínimo 10 caracteres)..."
            className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 ${inputSurface}`}
          />
          <p className={`text-[11px] mt-1 tabular-nums ${mutedText}`}>
            {sanitizePlainText(content).length} / {REVIEW_CONSTRAINTS.contentMaxLength} caracteres útiles
          </p>
        </div>

        {formError && (
          <p role="alert" className="text-xs font-medium text-[#B45335]">
            {formError}
          </p>
        )}

        {submitNotice && (
          <p role="status" className="text-xs font-medium text-[#4A5D4E]">
            {submitNotice}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {!user ? (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={signingIn}
              className={`text-xs underline underline-offset-4 ${mutedText} hover:text-[#B45335] transition-colors`}
            >
              {signingIn
                ? 'Conectando con Google...'
                : 'Entrar con Google para publicar en la nube'}
            </button>
          ) : (
            <span className={`text-xs ${mutedText}`}>
              Publicando como {user.displayName || 'Lector'}
            </span>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] disabled:opacity-60 transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden="true" />
            {submitting
              ? 'Publicando...'
              : user
                ? 'Publicar reseña'
                : 'Guardar reseña'}
          </button>
        </div>
      </form>

      {loadNotice && <p className={`text-xs ${mutedText}`}>{loadNotice}</p>}

      {loading ? (
        <p className={`text-sm ${mutedText}`}>Cargando impresiones de la comunidad...</p>
      ) : reviews.length === 0 ? (
        <div className={`rounded-xl border p-5 text-sm ${cardSurface} ${mutedText}`}>
          Aún no hay reseñas escritas para esta obra. Sé la primera persona en dejar su huella tras descargar o leer el ejemplar.
        </div>
      ) : (
        <ul className="space-y-3" data-testid="community-review-list">
          {reviews.map((review) => (
            <li
              key={review.id}
              className={`rounded-xl border p-4 sm:p-5 space-y-2.5 ${cardSurface}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold">{review.authorName}</span>
                  <span className="text-xs text-[#D97757]" aria-label={`${review.rating} de 5 estrellas`}>
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                </div>
                <time className={`text-xs tabular-nums ${mutedText}`}>
                  {new Date(review.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>

              <p className="text-sm leading-relaxed">{review.content}</p>

              {review.reactionTags.length > 0 && (
                <p className={`text-xs font-medium ${isNight ? 'text-[#8FA893]' : 'text-[#4A5D4E]'}`}>
                  {review.reactionTags.join(' · ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
