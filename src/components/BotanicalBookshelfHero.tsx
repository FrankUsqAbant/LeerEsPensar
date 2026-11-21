import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  getAllGenres,
} from '../data/catalogEngine';
import type {
  BookGenre,
  BookIndexEntry,
  ReadingProgress,
} from '../types/folio';
import {
  buildLibraryShelves,
  buildSlidingShelves,
  daySeedFor,
  computePhysicalBookStyle,
  type BookshelfRow,
} from '../utils/bookshelfLayout';
import { BookSeductionSheet } from './BookSeductionSheet';
import { BookVolume3D } from './BookVolume3D';
import { GenreRibbon } from './GenreRibbon';
import { SIN_GENERO, useLibraryBooks } from '../data/library';
import { useShelfScroller } from '../hooks/useShelfScroller';

export interface BotanicalBookshelfHeroProps {
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  onStartBookReading: (book: BookIndexEntry) => void;
  onDownloadBookPdf: (book: BookIndexEntry) => Promise<string | null>;
}

const OAK_DECK_GRADIENT =
  'linear-gradient(180deg, rgba(255,240,214,0.45) 0%, rgba(255,240,214,0) 45%, rgba(58,34,14,0.28) 100%), url(/assets/oak-grain.webp) 0 30% / 640px auto';

const OAK_LIP_GRADIENT =
  'linear-gradient(180deg, rgba(255,236,204,0.6) 0%, rgba(255,236,204,0.08) 14%, rgba(0,0,0,0) 55%, rgba(62,36,14,0.5) 100%), url(/assets/oak-grain.webp) 0 60% / 900px auto';

const OAK_STILE_GRADIENT =
  'linear-gradient(90deg, rgba(62,36,14,0.45) 0%, rgba(255,236,204,0.28) 38%, rgba(0,0,0,0) 60%, rgba(62,36,14,0.5) 100%), url(/assets/oak-grain-vertical.jpg) center / auto 1000px';

interface SlidingShelfRowProps {
  row: BookshelfRow;
  woodGrainFilterId: string;
  filterKey: string;
  prefersReducedMotion: boolean | null;
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  onOpenBook: (book: BookIndexEntry) => void;
  /** Muestra el nombre de la repisa ("Recién llegados", "Para hoy", "Resultados"). */
  showLabel?: boolean;
}

function SlidingShelfRow({
  row,
  woodGrainFilterId,
  filterKey,
  prefersReducedMotion,
  getBookProgress,
  onOpenBook,
  showLabel = false,
}: SlidingShelfRowProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Desplazamiento suave + solo se dibujan los libros visibles (repisas de cientos de libros).
  const { win, arrowProps, trackProps, resetToStart } = useShelfScroller(
    trackRef,
    row.slots.length,
    prefersReducedMotion,
  );

  const updateScrollBounds = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    setCanScrollLeft(node.scrollLeft > 6);
    setCanScrollRight(node.scrollLeft < maxScroll - 6);
  }, []);

  // Al cambiar género, escritor o búsqueda, regresa suavemente al inicio de la repisa
  useEffect(() => {
    resetToStart();
    const raf = window.requestAnimationFrame(updateScrollBounds);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, row.slots.length, updateScrollBounds]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    updateScrollBounds();
    const onScroll = () => updateScrollBounds();
    node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollBounds);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollBounds);
      observer.observe(node);
    }

    return () => {
      node.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollBounds);
      observer?.disconnect();
    };
  }, [updateScrollBounds]);

  const isScrollable = canScrollLeft || canScrollRight;

  return (
    <div data-shelf-index={row.index} className="relative">
      {showLabel && (
        <p className="relative z-20 px-5 sm:px-9 pt-1 -mb-0.5 font-serif italic text-[13px] sm:text-sm text-[var(--room-ink-soft)]">
          {row.label}
        </p>
      )}
      {/* Zona de libros físicos iluminada dentro del nicho arquitectónico */}
      <div className="relative">
        {/* Luz cálida de galería descendiendo sobre las portadas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 bottom-0"
          style={{
            background:
              'var(--room-shelf-light)',
          }}
        />

        {/* Botón deslizante izquierdo (ubicado fuera del área de las portadas) */}
        {isScrollable && (
          <button
            type="button"
            data-testid={`shelf-prev-${row.index}`}
            aria-label="Desplazar libros hacia la izquierda"
            disabled={!canScrollLeft}
            title="Clic: avanzar · Mantén presionado: deslizar"
            {...arrowProps(-1)}
            className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-[45] w-8 h-8 sm:w-9 sm:h-9 rounded-full max-sm:!hidden bg-[var(--room-field)]/95 border border-[#C7B69B] text-[var(--room-ink)] shadow-[0_8px_18px_-6px_rgba(32,20,8,0.42)] hover:bg-[var(--room-ink)] hover:text-[var(--room-field)] hover:border-[var(--room-ink)] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        )}

        {/* Botón deslizante derecho (ubicado fuera del área de las portadas) */}
        {isScrollable && (
          <button
            type="button"
            data-testid={`shelf-next-${row.index}`}
            aria-label="Desplazar libros hacia la derecha"
            disabled={!canScrollRight}
            title="Clic: avanzar · Mantén presionado: deslizar"
            {...arrowProps(1)}
            className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-[45] w-8 h-8 sm:w-9 sm:h-9 rounded-full max-sm:!hidden bg-[var(--room-field)]/95 border border-[#C7B69B] text-[var(--room-ink)] shadow-[0_8px_18px_-6px_rgba(32,20,8,0.42)] hover:bg-[var(--room-ink)] hover:text-[var(--room-field)] hover:border-[var(--room-ink)] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        )}

        {/* Carril horizontal deslizable con margen limpio para los controles laterales */}
        <div
          ref={trackRef}
          data-testid={`shelf-track-${row.index}`}
          {...trackProps}
          className="book-perspective-stage relative z-10 mx-4 sm:mx-12 flex gap-3 sm:gap-4 lg:gap-5 items-end overflow-x-auto no-scrollbar pt-2 sm:pt-2.5 pb-0 px-1.5 sm:px-2 max-sm:snap-x max-sm:snap-mandatory max-sm:scroll-px-1.5 sm:cursor-grab select-none"
        >
          {/* Espacio de los libros a la izquierda que no se dibujan (fuera de la vista) */}
          {win.start > 0 && win.span > 0 && (
            <div aria-hidden="true" className="shrink-0 h-px" style={{ width: win.start * win.span - win.gap }} />
          )}
          {row.slots.slice(win.start, win.end).map((slot, i) => {
            const slotIndex = win.start + i;
            return (
              <BookVolume3D
                key={slot.book.id}
                book={slot.book}
                heightPx={slot.heightPx}
                physical={computePhysicalBookStyle(slot.book.pageCount, row.index, slotIndex)}
                progress={getBookProgress(slot.book.id)}
                prefersReducedMotion={prefersReducedMotion}
                onOpen={onOpenBook}
              />
            );
          })}
          {/* Espacio de los libros a la derecha que aún no se dibujan */}
          {win.end < row.slots.length && win.span > 0 && (
            <div
              aria-hidden="true"
              className="shrink-0 h-px"
              style={{ width: (row.slots.length - win.end) * win.span - win.gap }}
            />
          )}
        </div>
      </div>

      {/* Repisa de roble natural con tablero superior, canto frontal biselado y sombras */}
      <div className="relative">
        <div
          className="relative z-10 h-3 mx-0 sm:mx-1 rounded-t-[2px] overflow-hidden border-t border-[#F4E3CA]"
          style={{ background: OAK_DECK_GRADIENT }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-1.5 bg-gradient-to-t from-[#3B2614]/28 to-transparent"
          />
        </div>

        <div
          className="relative z-20 h-4 w-full rounded-b-[3px] overflow-hidden border-t border-[#F7E9D2]/85 border-b border-[#5E3D1E]/70 shadow-[inset_0_1px_0_rgba(255,244,224,0.7),inset_0_-3px_4px_rgba(52,30,10,0.35),0_16px_26px_-8px_rgba(32,20,8,0.45)]"
          style={{ background: OAK_LIP_GRADIENT }}
        >
        </div>

        {/* Sombra proyectada por la tabla sobre la pared interior del mueble */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-0 h-4 mx-1"
          style={{
            background:
              'linear-gradient(180deg, rgba(42,26,12,0.3) 0%, rgba(42,26,12,0.12) 45%, rgba(42,26,12,0) 100%)',
          }}
        />

        {/* Ménsulas laterales talladas */}
        <div className="pointer-events-none relative z-10 -mt-4 flex justify-between px-5 sm:px-10">
          <div
            aria-hidden="true"
            className="w-3 h-4 rounded-b-sm border-x border-b border-[#6C4928]/45 shadow-[4px_6px_10px_rgba(38,24,12,0.24)]"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,236,204,0.25) 0%, rgba(62,36,14,0.45) 100%), url(/assets/oak-grain-vertical.jpg) center / auto 400px',
            }}
          />
          <div
            aria-hidden="true"
            className="w-3 h-4 rounded-b-sm border-x border-b border-[#6C4928]/45 shadow-[4px_6px_10px_rgba(38,24,12,0.24)]"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,236,204,0.25) 0%, rgba(62,36,14,0.45) 100%), url(/assets/oak-grain-vertical.jpg) center / auto 400px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function BotanicalBookshelfHero({
  getBookProgress,
  onStartBookReading,
  onDownloadBookPdf,
}: BotanicalBookshelfHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const stuccoFilterId = useId();
  const woodGrainFilterId = useId();

  // Biblioteca completa desde /api/catalogo; mientras carga (o si falla), la selección de 16 libros.
  const { books, status } = useLibraryBooks();
  const isLibrary = status === 'biblioteca';
  const genres = useMemo(() => getAllGenres(books), [books]);
  const daySeed = useMemo(() => daySeedFor(new Date()), []);

  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<BookGenre | 'Todos'>('Todos');
  const authorId = 'Todos' as const;
  const [selectedBook, setSelectedBook] = useState<BookIndexEntry | null>(null);
  const [readerNotice, setReaderNotice] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const shelfData = useMemo(
    () =>
      isLibrary
        ? buildLibraryShelves(books, { search, genre, authorId }, { daySeed, featuredCount: 24, featuredMinScore: 70 })
        : { ...buildSlidingShelves(books, { search, genre, authorId }), shown: 0, hasMore: false },
    [books, isLibrary, search, genre, authorId, daySeed],
  );

  const filterKey = `${search}__${genre}__${authorId}`;

  const resetFilters = () => {
    setSearch('');
    setGenre('Todos');
  };

  const handleOpenBook = (book: BookIndexEntry) => {
    setReaderNotice(null);
    setSelectedBook(book);
  };

  const handleEnterReader = (book: BookIndexEntry) => {
    setSelectedBook(null);
    onStartBookReading(book);
  };

  const handleDownloadFromSheet = async (book: BookIndexEntry) => {
    setDownloadingPdf(true);
    try {
      const message = await onDownloadBookPdf(book);
      setSelectedBook(null);
      if (message) {
        setReaderNotice(message);
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <section
      id="biblioteca"
      aria-label="Estantería editorial LeerEsPensar"
      className="relative overflow-hidden bg-[var(--room-wall)] transition-colors duration-700 pt-4 sm:pt-5 pb-10 sm:pb-14"
    >

      {/* Filtros SVG ocultos para estuco fino y veta orgánica de roble */}
      <svg aria-hidden="true" className="sr-only">
        <defs>
          <filter id={stuccoFilterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.72"
              numOctaves="3"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0.18" />
          </filter>
          <filter id={woodGrainFilterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.014 0.24"
              numOctaves="3"
              seed="7"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.36  0 0 0 0 0.23  0 0 0 0 0.11  0 0 0 0.24 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Textura mineral de la pared verde biblioteca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ filter: `url(#${stuccoFilterId})` }}
      />

      {/* Luz cálida de lámpara sobre la pared verde, que se apaga hacia abajo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, var(--room-glow) 0%, rgba(0,0,0,0) 72%), linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(20,18,14,0.08) 100%)',
        }}
      />

      <div className="relative z-10 max-w-[84rem] mx-auto px-3 sm:px-5 lg:px-6 space-y-3 sm:space-y-4">
        {/* Título editorial: la frase del nombre, con "pensar" en cursiva. El estante es la imagen. */}
        <div className="text-center px-4 pt-4 sm:pt-8 pb-1 sm:pb-2">
          <h1 className="font-serif font-medium tracking-tight text-[var(--room-ink)] text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">
            Leer es <em className="italic font-normal text-[var(--room-accent)]">pensar.</em>
          </h1>
          <p className="mt-3 sm:mt-4 text-[13px] sm:text-[15px] text-[var(--room-ink-soft)]">
            Cada libro es una conversación que te espera. Llévatelo gratis.
          </p>
        </div>

        {/* Un solo buscador (título, autor o tema) y los géneros como etiquetas suaves */}
        <div data-testid="bookshelf-filter-bar" className="max-w-2xl mx-auto space-y-3">
          <div className="relative">
            <label htmlFor="hero-search" className="sr-only">
              Buscar por título, autor o tema
            </label>
            <Search
              className="w-4 h-4 text-[var(--room-ink-soft)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="hero-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Busca por título, autor o tema…"
              className="w-full pl-11 pr-11 py-3 text-sm rounded-full bg-[var(--room-field)] text-[var(--room-ink)] placeholder:text-[var(--room-ink-soft)] border border-[var(--room-line)] shadow-[0_10px_26px_-18px_rgba(0,0,0,0.45)] focus:outline-none focus:ring-2 focus:ring-[var(--room-accent)]/40 transition-colors"
            />
            {shelfData.hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                aria-label="Limpiar búsqueda y género"
                title="Limpiar"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--room-accent)] hover:bg-[var(--room-page)] rounded-full transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {genres.filter((g) => g !== SIN_GENERO).length >= 2 && (
          <GenreRibbon
            items={['Todos', ...genres] as Array<BookGenre | 'Todos'>}
            active={genre}
            onSelect={(item) => setGenre(genre === item && item !== 'Todos' ? 'Todos' : item)}
          />
          )}
        </div>

        {readerNotice && (
          <div
            role="status"
            className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-[#4A5D4E]/35 bg-[var(--room-field)] text-xs sm:text-sm text-[var(--room-ink)]"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#4A5D4E] shrink-0" aria-hidden="true" />
              {readerNotice}
            </span>
            <button
              type="button"
              onClick={() => setReaderNotice(null)}
              className="text-xs font-medium text-[#4A5D4E] underline underline-offset-4 shrink-0"
            >
              Entendido
            </button>
          </div>
        )}

        <div className="relative">
        {/* Mueble-estantería arquitectónico en nicho cálido con pilares laterales de roble */}
        <div
          data-testid="botanical-bookshelf"
          className="relative rounded-2xl border border-[#8F6438]/50 bg-[var(--room-shelf)] shadow-[inset_0_16px_40px_-20px_rgba(42,26,12,0.3),0_30px_60px_-28px_rgba(42,26,12,0.5)] overflow-hidden"
        >
          {/* Moldura superior arquitectónica en roble */}
          <div
            aria-hidden="true"
            className="h-3.5 w-full border-b border-[#5E3D1E]/60 shadow-[inset_0_1px_0_rgba(255,244,224,0.6),0_6px_14px_rgba(42,26,12,0.25)]"
            style={{ background: OAK_LIP_GRADIENT }}
          />

          {/* Pilares verticales laterales del mueble */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-3 sm:w-5 z-30 border-r border-[#80552C]/35 shadow-[4px_0_12px_rgba(42,26,12,0.18)]"
            style={{ background: OAK_STILE_GRADIENT }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-3 sm:w-5 z-30 border-l border-[#80552C]/35 shadow-[-4px_0_12px_rgba(42,26,12,0.18)]"
            style={{ background: OAK_STILE_GRADIENT }}
          />

          {/* Interior de las repisas */}
          <div className="relative px-2 sm:px-3 pt-2.5 sm:pt-3 pb-2 space-y-2 sm:space-y-3">
            {shelfData.rows.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-3">
                <p className="font-serif text-xl text-[var(--room-ink)]">
                  No encontramos ejemplares con ese filtro
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[var(--room-ink)] text-[var(--room-field)] rounded-lg hover:bg-[var(--room-ink-soft)] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Mostrar toda la estantería
                </button>
              </div>
            ) : (
              shelfData.rows.map((row) => (
                <SlidingShelfRow
                  key={row.index}
                  row={row}
                  woodGrainFilterId={woodGrainFilterId}
                  filterKey={filterKey}
                  prefersReducedMotion={prefersReducedMotion}
                  getBookProgress={getBookProgress}
                  onOpenBook={handleOpenBook}
                  showLabel={isLibrary}
                />
              ))
            )}
          </div>

          {/* Zócalo inferior en roble */}
          <div
            aria-hidden="true"
            className="h-3.5 w-full border-t border-[#F4E3CA]"
            style={{ background: OAK_LIP_GRADIENT }}
          />
        </div>
        </div>

        {/* Biblioteca grande: cuántos libros hay (todos están en alguna repisa) */}
        {isLibrary && shelfData.rows.length > 0 && (
          <p className="pt-1 text-center text-xs text-[var(--room-ink-soft)] tabular-nums" aria-live="polite">
            {shelfData.hasActiveFilter
              ? `${shelfData.totalMatches} ${shelfData.totalMatches === 1 ? 'libro encontrado' : 'libros encontrados'}`
              : `${books.length} libros en la biblioteca · desliza cada repisa para ver más`}
          </p>
        )}
      </div>

      <BookSeductionSheet
        book={selectedBook}
        progress={selectedBook ? getBookProgress(selectedBook.id) : undefined}
        downloadingPdf={downloadingPdf}
        onClose={() => setSelectedBook(null)}
        onStartReading={handleEnterReader}
        onDownloadPdf={(book) => void handleDownloadFromSheet(book)}
      />
    </section>
  );
}
