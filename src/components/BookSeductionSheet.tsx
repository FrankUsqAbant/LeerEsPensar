import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, Download, Share2, X } from 'lucide-react';
import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react';
import { getAuthorById } from '../data/catalogEngine';
import type { BookIndexEntry, ReadingProgress } from '../types/folio';
import { ShareBookModal } from './ShareBookModal';

export interface BookSeductionSheetProps {
  book: BookIndexEntry | null;
  progress: ReadingProgress | undefined;
  downloadingPdf?: boolean;
  onClose: () => void;
  onStartReading: (book: BookIndexEntry) => void;
  onDownloadPdf: (book: BookIndexEntry) => void;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.45, 0, 0.25, 1];
/** Vuelo de la portada: arranca suave (sin tirón), avanza y aterriza despacio. */
const EASE_FLIGHT: [number, number, number, number] = [0.5, 0, 0.2, 1];

function isWideViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

/** Libro del estante del que sale la portada (para el vuelo de ida y vuelta). */
function findShelfBook(bookId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-testid="shelf-book-${bookId}"]`);
}

/** Traslado y escala que llevan la portada de la ficha encima del libro del estante. */
function flightFrom(origin: DOMRect, target: DOMRect) {
  return {
    x: origin.left + origin.width / 2 - (target.left + target.width / 2),
    y: origin.top + origin.height / 2 - (target.top + target.height / 2),
    scale: origin.height / target.height,
  };
}

/**
 * Ficha del libro como doble página: la portada sale volando del estante hacia la
 * página izquierda y la página derecha se despliega desde el lomo. Al cerrar, el
 * movimiento se invierte y el libro vuelve a su hueco.
 */
export function BookSeductionSheet({
  book,
  progress,
  downloadingPdf = false,
  onClose,
  onStartReading,
  onDownloadPdf,
}: BookSeductionSheetProps) {
  const prefersReducedMotion = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareOpenRef = useRef(false);
  shareOpenRef.current = shareOpen;

  // Al cerrar o cambiar de libro, la ventana de compartir también se cierra.
  useEffect(() => {
    setShareOpen(false);
  }, [book?.id]);

  // Apertura: se mide antes de pintar para que el primer cuadro ya esté sobre el estante.
  useLayoutEffect(() => {
    if (!book) return;
    closingRef.current = false;
    const cover = coverRef.current;
    const page = pageRef.current;
    const origin = findShelfBook(book.id);
    originRef.current = origin;

    if (prefersReducedMotion || !cover || !page) return;

    const wide = isWideViewport();
    if (origin) {
      const from = flightFrom(origin.getBoundingClientRect(), cover.getBoundingClientRect());
      cover.style.transform = `translate(${from.x}px, ${from.y}px) scale(${from.scale})`;
      origin.style.visibility = 'hidden';
      void animate(
        cover,
        { x: [from.x, 0], y: [from.y, 0], scale: [from.scale, 1] },
        { duration: 1, ease: EASE_FLIGHT },
      );
    }

    page.style.opacity = '0';
    if (wide) {
      void animate(
        page,
        { rotateY: [-95, 0], opacity: [0, 1] },
        { duration: 1, delay: 0.55, ease: EASE_OUT },
      );
    } else {
      void animate(page, { y: [20, 0], opacity: [0, 1] }, { duration: 0.8, delay: 0.5, ease: EASE_OUT });
    }

    return () => {
      if (origin) origin.style.visibility = '';
    };
  }, [book, prefersReducedMotion, animate]);

  // Cierre: la página se pliega y la portada regresa a su hueco en el estante.
  const requestClose = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const cover = coverRef.current;
    const page = pageRef.current;
    const origin = originRef.current;
    const root = scope.current;

    if (prefersReducedMotion || !cover || !page || !root) {
      onClose();
      return;
    }

    const wide = isWideViewport();
    await animate(
      page,
      wide ? { rotateY: -95, opacity: 0 } : { y: 28, opacity: 0 },
      { duration: 0.5, ease: EASE_IN_OUT },
    );

    if (origin) {
      // Se mide sin el desplazamiento actual de la portada para calcular el destino exacto.
      const current = cover.getBoundingClientRect();
      const to = flightFrom(origin.getBoundingClientRect(), current);
      void animate(root, { backgroundColor: 'rgba(26,25,23,0)' }, { duration: 0.8, ease: EASE_IN_OUT });
      await animate(cover, { x: to.x, y: to.y, scale: to.scale }, { duration: 0.8, ease: EASE_FLIGHT });
      origin.style.visibility = '';
    }
    onClose();
  }, [animate, onClose, prefersReducedMotion, scope]);

  useEffect(() => {
    if (!book) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // Con la ventana de compartir abierta, Escape solo cierra esa ventana.
      if (event.key === 'Escape' && !shareOpenRef.current) void requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [book, requestClose]);

  const author = book ? getAuthorById(book.authorId) : undefined;
  const hasStarted = Boolean(progress && progress.currentPage > 0);
  const percentage = progress?.percentage ?? 0;

  return (
    <>
    <AnimatePresence>
      {book && (
        <motion.div
          key="seduction-backdrop"
          ref={scope}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.6, ease: 'easeOut' }}
          onClick={() => void requestClose()}
          className="fixed inset-0 z-40 bg-[var(--room-ink)]/60 flex items-center justify-center p-3 sm:p-6"
        >
          <div
            key={book.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seduction-book-title"
            data-testid="book-seduction-sheet"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[92vh] md:h-[min(88vh,660px)] flex flex-col md:flex-row [perspective:2000px]"
          >
            {/* Página izquierda: la portada que salió del estante */}
            <div className="relative shrink-0 md:w-[40%] bg-[var(--room-shelf)] rounded-t-[10px] md:rounded-tr-none md:rounded-l-[10px] px-6 py-5 md:p-10 flex flex-col items-center justify-center gap-4 md:gap-6 shadow-[0_40px_80px_-30px_rgba(20,12,4,0.6)]">
              <span
                aria-hidden="true"
                className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#3A2614]/18 to-transparent"
              />

              <div
                ref={coverRef}
                className="relative z-10 w-[120px] md:w-[230px] aspect-[3/4] rounded-r-lg rounded-l-sm border p-3 md:p-5 flex flex-col justify-between overflow-hidden shadow-[0_18px_30px_-12px_rgba(30,18,6,0.55)] will-change-transform"
                style={{
                  backgroundColor: book.coverTheme.paperTint,
                  borderColor: book.coverTheme.inkColor.toUpperCase().startsWith('#F')
                    ? 'rgba(255,250,240,0.2)'
                    : 'rgba(26,25,23,0.15)',
                  borderLeftWidth: '10px',
                  borderLeftColor: book.coverTheme.spineColor,
                }}
              >
                <span
                  className="text-[9px] md:text-[11px] font-medium tracking-wide"
                  style={{ color: book.coverTheme.secondaryTextColor ?? 'var(--room-ink-soft)' }}
                >
                  {book.genre}
                </span>
                <div>
                  <p
                    className="font-serif text-sm md:text-2xl font-medium leading-tight"
                    style={{ color: book.coverTheme.inkColor }}
                  >
                    {book.title}
                  </p>
                  <p
                    className="text-[10px] md:text-xs font-medium mt-1 md:mt-2"
                    style={{ color: book.coverTheme.accentColor }}
                  >
                    {book.authorName}
                  </p>
                </div>
                <div
                  className="pt-2 md:pt-3 border-t flex items-center justify-between text-[9px] md:text-[11px] tabular-nums"
                  style={{
                    borderColor: book.coverTheme.inkColor.toUpperCase().startsWith('#F')
                      ? 'rgba(255,250,240,0.2)'
                      : 'rgba(26,25,23,0.12)',
                    color: book.coverTheme.secondaryTextColor ?? 'var(--room-ink-soft)',
                  }}
                >
                  <span>{book.publicationYear}</span>
                  <span>{book.pageCount} p.</span>
                </div>
              </div>

              <p className="relative z-10 hidden md:block text-xs text-[var(--room-ink-soft)] tabular-nums text-center">
                {book.genre} · {book.publicationYear} · {book.readingTimeMinutes} min · {book.pageCount} págs.
              </p>
            </div>

            {/* Página derecha: se despliega desde el lomo */}
            <div
              ref={pageRef}
              style={{ transformOrigin: 'left center' }}
              className="relative min-h-0 flex-1 md:w-[60%] bg-[var(--room-field)] rounded-b-[10px] md:rounded-bl-none md:rounded-r-[10px] flex flex-col overflow-hidden shadow-[0_40px_80px_-30px_rgba(20,12,4,0.6)] will-change-transform"
            >
              <span
                aria-hidden="true"
                className="hidden md:block pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#3A2614]/12 to-transparent z-10"
              />

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => void requestClose()}
                aria-label={`Cerrar ficha de ${book.title}`}
                className="absolute top-3 right-3 z-20 p-2 text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-line)]/70 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => setShareOpen(true)}
                data-testid="sheet-share"
                className="absolute top-3 right-14 z-20 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-line)]/70 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Compartir</span>
                <span className="sr-only sm:hidden">Compartir {book.title}</span>
              </button>

              <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 pt-8 sm:pt-10 pb-8 space-y-7">
                <header className="pr-14 sm:pr-28">
                  <h2
                    id="seduction-book-title"
                    className="font-serif text-3xl sm:text-[2.6rem] font-medium text-[var(--room-ink)] leading-[1.05] tracking-tight"
                  >
                    {book.title}
                  </h2>
                  {book.subtitle && (
                    <p className="font-serif italic text-base text-[var(--room-ink-soft)] mt-2">{book.subtitle}</p>
                  )}
                  <p className="text-sm font-medium text-[var(--room-accent)] mt-3">
                    {book.authorName}
                    {author ? (
                      <span className="font-normal text-[var(--room-ink-soft)]">
                        {' '}
                        · {author.country} ({author.lifespan})
                      </span>
                    ) : null}
                  </p>
                  {author && (
                    <p className="text-[13px] text-[var(--room-ink-soft)] leading-relaxed mt-2">{author.shortBio}</p>
                  )}
                </header>

                <section>
                  <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#4A5D4E] mb-2">
                    De qué va
                  </h3>
                  <p className="text-[15px] text-[var(--room-ink)] leading-relaxed">{book.hookSummary}</p>
                  <p className="text-xs text-[var(--room-ink-soft)] mt-3">
                    Atmósfera:{' '}
                    <span className="text-[var(--room-ink)]">{book.moods.join(' · ')}</span>
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#4A5D4E] mb-3">
                    Lo que te vas a llevar
                  </h3>
                  <ol className="space-y-3">
                    {book.takeaways.map((takeaway, index) => (
                      <li key={index} className="flex gap-3 text-sm text-[var(--room-ink)]/90 leading-relaxed">
                        <span className="font-serif italic text-lg leading-none text-[var(--room-accent)] tabular-nums pt-0.5 w-5 shrink-0">
                          {index + 1}
                        </span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#4A5D4E] mb-3">
                    Primer sorbo
                  </h3>
                  <blockquote className="border-l-2 border-[var(--room-accent)]/60 pl-4 font-serif italic text-lg text-[var(--room-ink)] leading-relaxed">
                    «{book.firstSip}»
                  </blockquote>
                </section>
              </div>

              {/* Acciones al pie de la página */}
              <div className="shrink-0 px-4 sm:px-10 py-3 sm:py-4 border-t border-[var(--room-line)] bg-[var(--room-page)]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <p className="text-xs text-[var(--room-ink-soft)] tabular-nums text-center sm:text-left">
                  {progress?.completed ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#4A5D4E]">
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      Ya terminaste esta obra
                    </span>
                  ) : hasStarted ? (
                    <span>
                      Llevas {percentage}% · pág. {progress?.currentPage} de {book.pageCount}
                    </span>
                  ) : (
                    <span>Gratis, en pantalla o en PDF</span>
                  )}
                </p>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => onStartReading(book)}
                    className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium bg-[var(--room-field)] border border-[var(--room-line)] text-[var(--room-ink)] rounded-full hover:bg-[var(--room-page)] transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    {hasStarted ? 'Continuar leyendo' : 'Leer en pantalla'}
                  </button>
                  <button
                    type="button"
                    data-testid="seduction-download-pdf"
                    disabled={downloadingPdf}
                    onClick={() => onDownloadPdf(book)}
                    className="inline-flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 text-sm font-medium bg-[var(--room-ink)] text-[var(--room-field)] rounded-full hover:bg-[var(--room-ink-soft)] disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    {downloadingPdf ? 'Preparando PDF…' : 'Descargar PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    <ShareBookModal book={book} open={shareOpen && Boolean(book)} onClose={() => setShareOpen(false)} />
    </>
  );
}
