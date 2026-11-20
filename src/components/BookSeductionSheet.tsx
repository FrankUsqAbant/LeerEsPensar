import { useEffect, useRef } from 'react';
import { BookOpen, CheckCircle2, Download, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { getAuthorById } from '../data/catalogEngine';
import type { BookIndexEntry, ReadingProgress } from '../types/folio';

export interface BookSeductionSheetProps {
  book: BookIndexEntry | null;
  progress: ReadingProgress | undefined;
  downloadingPdf?: boolean;
  onClose: () => void;
  onStartReading: (book: BookIndexEntry) => void;
  onDownloadPdf: (book: BookIndexEntry) => void;
}

export function BookSeductionSheet({
  book,
  progress,
  downloadingPdf = false,
  onClose,
  onStartReading,
  onDownloadPdf,
}: BookSeductionSheetProps) {
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!book) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [book, onClose]);

  const author = book ? getAuthorById(book.authorId) : undefined;
  const hasStarted = Boolean(progress && progress.currentPage > 0);
  const percentage = progress?.percentage ?? 0;

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          key="seduction-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#1A1917]/55 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            key={book.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="seduction-book-title"
            data-testid="book-seduction-sheet"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
          >
            {/* Cabecera fija con cierre accesible */}
            <div className="flex items-center justify-between gap-4 px-6 sm:px-8 py-4 border-b border-[#E6DFD3] bg-[#F3EFE8]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B665E] tabular-nums">
                <span className="font-medium text-[#4A5D4E]">{book.genre}</span>
                <span aria-hidden="true">·</span>
                <span>{book.publicationYear}</span>
                <span aria-hidden="true">·</span>
                <span>{book.readingTimeMinutes} min</span>
                <span aria-hidden="true">·</span>
                <span>{book.pageCount} págs.</span>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={`Cerrar ficha de ${book.title}`}
                className="p-2 text-[#6B665E] hover:text-[#1A1917] hover:bg-[#E6DFD3]/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Cuerpo editorial desplazable */}
            <div className="overflow-y-auto px-6 sm:px-8 py-7 space-y-7">
              {/* Presentación de cubierta + título + autor */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-4">
                  <div
                    className="relative aspect-[3/4] rounded-r-xl rounded-l-sm border shadow-md p-5 flex flex-col justify-between overflow-hidden"
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
                      className="text-[11px] font-medium tracking-wide"
                      style={{ color: book.coverTheme.secondaryTextColor ?? '#6B665E' }}
                    >
                      {book.genre}
                    </span>
                    <div>
                      <p
                        className="font-serif text-xl font-medium leading-tight"
                        style={{ color: book.coverTheme.inkColor }}
                      >
                        {book.title}
                      </p>
                      <p
                        className="text-xs font-medium mt-1.5"
                        style={{ color: book.coverTheme.accentColor }}
                      >
                        {book.authorName}
                      </p>
                    </div>
                    <div
                      className="pt-3 border-t flex items-center justify-between text-[11px] tabular-nums"
                      style={{
                        borderColor: book.coverTheme.inkColor.toUpperCase().startsWith('#F')
                          ? 'rgba(255,250,240,0.2)'
                          : 'rgba(26,25,23,0.12)',
                        color: book.coverTheme.secondaryTextColor ?? '#6B665E',
                      }}
                    >
                      <span>{book.publicationYear}</span>
                      <span>{book.pageCount} p.</span>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-4">
                  <div>
                    <h2
                      id="seduction-book-title"
                      className="font-serif text-3xl sm:text-4xl font-medium text-[#1A1917] leading-tight"
                    >
                      {book.title}
                    </h2>
                    {book.subtitle && (
                      <p className="text-sm text-[#6B665E] mt-1">{book.subtitle}</p>
                    )}
                    <p className="text-base font-medium text-[#B45335] mt-2">
                      {book.authorName}
                      {author ? ` · ${author.country} (${author.lifespan})` : ''}
                    </p>
                  </div>

                  {author && (
                    <p className="text-xs text-[#6B665E] leading-relaxed">
                      {author.shortBio}
                    </p>
                  )}

                  {/* El Gancho */}
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold tracking-wide text-[#4A5D4E] mb-1.5">
                      El Gancho
                    </h3>
                    <p className="text-sm sm:text-base text-[#1A1917] leading-relaxed">
                      {book.hookSummary}
                    </p>
                  </div>

                  {/* Estados de ánimo en texto limpio sin cápsulas */}
                  <p className="text-xs text-[#6B665E]">
                    Atmósfera de lectura:{' '}
                    <span className="text-[#1A1917] font-medium">
                      {book.moods.join(' · ')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Lo que te vas a llevar */}
              <div className="border-t border-[#E6DFD3] pt-6">
                <h3 className="font-serif text-lg font-medium text-[#1A1917] mb-3">
                  Lo que te vas a llevar
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {book.takeaways.map((takeaway, index) => (
                    <li
                      key={index}
                      className="p-4 rounded-xl bg-[#F3EFE8] border border-[#E6DFD3] text-xs sm:text-sm text-[#1A1917]/90 leading-relaxed"
                    >
                      <span className="block font-mono text-[11px] text-[#B45335] mb-1.5 tabular-nums">
                        0{index + 1}.
                      </span>
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Primer Sorbo */}
              <div className="border-t border-[#E6DFD3] pt-6">
                <h3 className="font-serif text-lg font-medium text-[#1A1917] mb-3">
                  Primer Sorbo
                </h3>
                <blockquote className="p-5 sm:p-6 rounded-xl bg-[#F3EFE8]/70 border border-[#E6DFD3] font-serif italic text-base sm:text-lg text-[#1A1917] leading-relaxed">
                  «{book.firstSip}»
                </blockquote>
              </div>
            </div>

            {/* Pie fijo de acción con descarga PDF prioritaria */}
            <div className="px-6 sm:px-8 py-4 border-t border-[#E6DFD3] bg-[#F3EFE8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-[#6B665E] tabular-nums">
                {progress?.completed ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#4A5D4E]">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Ya terminaste esta obra (100%)
                  </span>
                ) : hasStarted ? (
                  <span>
                    Llevas {percentage}% leído · Página {progress?.currentPage} de {book.pageCount}
                  </span>
                ) : (
                  <span>PDF verificado con %PDF- y %%EOF · Descarga gratuita</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onStartReading(book)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#FAF8F5] border border-[#E6DFD3] text-[#1A1917] rounded-lg hover:bg-white transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  {hasStarted ? 'Continuar en pantalla' : 'Leer en pantalla'}
                </button>
                <button
                  type="button"
                  data-testid="seduction-download-pdf"
                  disabled={downloadingPdf}
                  onClick={() => onDownloadPdf(book)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {downloadingPdf ? 'Verificando PDF...' : 'Descargar PDF'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
