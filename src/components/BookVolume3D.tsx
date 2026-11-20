import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { BookIndexEntry, ReadingProgress } from '../types/folio';
import type { PhysicalBookStyle } from '../utils/bookshelfLayout';

export interface BookVolume3DProps {
  book: BookIndexEntry;
  heightPx: number;
  physical: PhysicalBookStyle;
  progress?: ReadingProgress;
  prefersReducedMotion: boolean | null;
  onOpen: (book: BookIndexEntry) => void;
}

/**
 * Volumen físico encuadernado en tapa dura (tela, media pasta o lino) con lomo 3D,
 * cabezada superior, grosor de páginas crema y cuatro estilos editoriales distintos.
 */
export function BookVolume3D({
  book,
  heightPx,
  physical,
  progress,
  prefersReducedMotion,
  onOpen,
}: BookVolume3DProps) {
  const pct = progress?.percentage ?? 0;
  const coverStyle = book.coverTheme.style ?? 'cloth-frame';
  const secondaryInk = book.coverTheme.secondaryTextColor ?? '#6B665E';
  const isDarkCloth = book.coverTheme.inkColor.toUpperCase().startsWith('#F');

  return (
    <div className="relative shrink-0 w-[112px] sm:w-[124px] lg:w-[134px] flex flex-col items-stretch">
      {/* Sombra proyectada diagonalmente detrás del volumen contra el fondo de la estantería */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2.5 top-3 bottom-1 translate-x-2.5 rounded-r-md bg-[#23160A]/28 blur-[6px]"
      />

      <motion.button
        type="button"
        data-testid={`shelf-book-${book.id}`}
        data-matched="true"
        onClick={() => onOpen(book)}
        aria-label={`Abrir ficha de ${book.title} por ${book.authorName}`}
        animate={{
          rotateZ: prefersReducedMotion ? 0 : physical.leanDeg,
        }}
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                y: -8,
                scale: 1.035,
                rotateZ: 0,
                rotateY: -11,
                rotateX: 3,
              }
        }
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: `${heightPx}px` }}
        className="book-3d-volume group relative w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B45335] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EDE4D5] rounded-r-md cursor-pointer"
      >
        {/* Cabezada tejida y canto superior de hojas crema */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 right-[3px] -top-[4px] h-[5px] rounded-t-[2px] border-t border-x border-[#CBBCA4]/90"
          style={{
            background:
              'linear-gradient(180deg, #E8DEC9 0%, #F7F1E4 100%)',
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 -top-[4px] w-3 h-[4px] rounded-tl-[2px]"
          style={{ backgroundColor: book.coverTheme.accentColor }}
        />

        {/* Bloque derecho de páginas crema visibles (grosor real según extensión) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-[2px] bottom-[2px] right-0 rounded-r-[3px] border-y border-r border-[#C4B499]/90"
          style={{
            width: `${physical.pageBlockWidthPx}px`,
            background:
              'repeating-linear-gradient(90deg, #F5EEDF 0px, #E4D8C1 1px, #FAF5EB 2px)',
            boxShadow:
              'inset 2px 0 4px rgba(38, 24, 12, 0.24), 1px 0 2px rgba(26, 20, 12, 0.16)',
          }}
        />

        {/* Tapa dura delantera con encuadernación táctil */}
        <div
          className="relative h-full rounded-l-[3px] rounded-r-[4px] border flex overflow-hidden shadow-[0_12px_20px_-8px_rgba(24,16,8,0.48)] group-hover:shadow-[0_24px_34px_-8px_rgba(24,16,8,0.62)] transition-shadow duration-200"
          style={{
            marginRight: `${Math.max(4, physical.pageBlockWidthPx - 4)}px`,
            backgroundColor: book.coverTheme.paperTint,
            borderColor: isDarkCloth ? 'rgba(255,250,240,0.16)' : 'rgba(26,25,23,0.2)',
          }}
        >
          {/* Lomo encuadernado con nervios en relieve y luz cilíndrica */}
          <div
            aria-hidden="true"
            className="relative shrink-0 h-full"
            style={{
              width: `${physical.spineWidthPx}px`,
              backgroundColor: book.coverTheme.spineColor,
              backgroundImage:
                'linear-gradient(90deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 45%, rgba(0,0,0,0.28) 100%)',
              boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.26)',
            }}
          >
            <span className="absolute top-5 inset-x-0.5 h-[1.5px] bg-white/30" />
            <span className="absolute top-8 inset-x-0.5 h-[1px] bg-white/15" />
            <span className="absolute bottom-8 inset-x-0.5 h-[1px] bg-black/25" />
            <span className="absolute bottom-5 inset-x-0.5 h-[1.5px] bg-white/25" />
          </div>

          {/* Variante "half-bound": banda vertical de media pasta adicional sobre la tapa */}
          {coverStyle === 'half-bound' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-[26%] border-r"
              style={{
                backgroundColor: book.coverTheme.spineColor,
                borderColor: book.coverTheme.accentColor,
                opacity: isDarkCloth ? 0.42 : 0.16,
              }}
            />
          )}

          {/* Superficie editorial de la portada */}
          <div className="relative flex-1 p-2 sm:p-2.5 flex flex-col justify-between overflow-hidden">
            {/* Micro-textura de lino tejido */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.24]"
              style={{
                backgroundImage: isDarkCloth
                  ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)'
                  : 'repeating-linear-gradient(0deg, rgba(26,25,23,0.035) 0px, rgba(26,25,23,0.035) 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(26,25,23,0.025) 0px, rgba(26,25,23,0.025) 1px, transparent 1px, transparent 3px)',
              }}
            />

            {/* Brillo cálido direccional sobre la cubierta */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: isDarkCloth
                  ? 'linear-gradient(132deg, rgba(255,248,232,0.18) 0%, rgba(255,248,232,0) 48%, rgba(0,0,0,0.22) 100%)'
                  : 'linear-gradient(132deg, rgba(255,253,246,0.62) 0%, rgba(255,253,246,0) 46%, rgba(44,30,18,0.08) 100%)',
              }}
            />

            {/* Ornamento arquitectónico específico según estilo de edición */}
            {coverStyle === 'cloth-frame' && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2.5 border rounded-[2px]"
                  style={{
                    borderColor: book.coverTheme.accentColor,
                    opacity: isDarkCloth ? 0.55 : 0.42,
                  }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-3.5 border rounded-[1px]"
                  style={{
                    borderColor: book.coverTheme.accentColor,
                    opacity: isDarkCloth ? 0.25 : 0.2,
                  }}
                />
              </>
            )}

            {coverStyle === 'linen-medallion' && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2.5 border rounded-[3px]"
                style={{
                  borderColor: book.coverTheme.accentColor,
                  opacity: isDarkCloth ? 0.4 : 0.3,
                }}
              />
            )}

            {coverStyle === 'arch-monogram' && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 top-2.5 bottom-2.5 border-t border-b rounded-t-[28px]"
                style={{
                  borderColor: book.coverTheme.accentColor,
                  opacity: isDarkCloth ? 0.45 : 0.32,
                }}
              />
            )}

            {/* Cabecera tipográfica: Género + detalle */}
            <div className="relative z-10 space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className="block text-[9.5px] font-medium tracking-wider uppercase truncate"
                  style={{ color: secondaryInk }}
                >
                  {book.genre}
                </span>
              </div>

              {coverStyle === 'linen-medallion' ? (
                <div
                  className="mt-1 px-2 py-2 border rounded-[3px]"
                  style={{
                    borderColor: book.coverTheme.accentColor,
                    backgroundColor: isDarkCloth
                      ? 'rgba(15, 18, 22, 0.24)'
                      : 'rgba(255, 253, 248, 0.46)',
                  }}
                >
                  <h3
                    className="font-serif text-[13px] sm:text-[14px] font-medium leading-[1.16] line-clamp-3"
                    style={{ color: book.coverTheme.inkColor }}
                  >
                    {book.title}
                  </h3>
                </div>
              ) : (
                <h3
                  className="font-serif text-[13.5px] sm:text-[14.5px] font-medium leading-[1.16] line-clamp-3 transition-opacity group-hover:opacity-90"
                  style={{ color: book.coverTheme.inkColor }}
                >
                  {book.title}
                </h3>
              )}
            </div>

            {/* Pie de portada: filete sutil, autor y tiempo/progreso */}
            <div className="relative z-10 space-y-1.5 pb-0.5">
              <span
                aria-hidden="true"
                className="block w-8 h-[1px] opacity-65"
                style={{ backgroundColor: book.coverTheme.accentColor }}
              />
              <p
                className="text-xs font-semibold truncate"
                style={{ color: book.coverTheme.accentColor }}
              >
                {book.authorName}
              </p>

              <div
                className="flex items-center justify-between text-[10px] tabular-nums"
                style={{ color: secondaryInk }}
              >
                <span>{book.readingTimeMinutes} min</span>
                {progress?.completed ? (
                  <span
                    className="inline-flex items-center gap-1 font-semibold"
                    style={{ color: book.coverTheme.accentColor }}
                  >
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    Leído
                  </span>
                ) : pct > 0 ? (
                  <span
                    className="font-semibold"
                    style={{ color: book.coverTheme.inkColor }}
                  >
                    {pct}%
                  </span>
                ) : (
                  <span>{book.publicationYear}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cinta marcapáginas de seda cuando el lector ya abrió el libro */}
        {pct > 0 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[7px] left-6 w-2 h-2.5 rounded-b-[1px] shadow-sm"
            style={{
              backgroundColor: progress?.completed ? '#4A5D4E' : '#B45335',
            }}
          />
        )}
      </motion.button>

      {/* Sombra de contacto firme sobre la repisa de madera */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-20 -mb-1.5 mx-1.5 h-2 rounded-full bg-[#1E1207]/52 blur-[2.5px]"
      />
    </div>
  );
}
