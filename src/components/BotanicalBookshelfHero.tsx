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
  getAllAuthors,
  getAllGenres,
  getCatalogBooks,
} from '../data/catalogEngine';
import type {
  BookGenre,
  BookIndexEntry,
  ReadingProgress,
} from '../types/folio';
import {
  buildSlidingShelves,
  computePhysicalBookStyle,
  type BookshelfRow,
} from '../utils/bookshelfLayout';
import { BookSeductionSheet } from './BookSeductionSheet';
import { BookVolume3D } from './BookVolume3D';
import { BotanicalBranchSvg } from './BotanicalOrnamentSvg';

export interface BotanicalBookshelfHeroProps {
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  onStartBookReading: (book: BookIndexEntry) => void;
  onDownloadBookPdf: (book: BookIndexEntry) => Promise<string | null>;
}

const OAK_DECK_GRADIENT =
  'linear-gradient(180deg, #E7CBA3 0%, #D8B586 64%, #C79D69 100%)';

const OAK_LIP_GRADIENT =
  'linear-gradient(180deg, #DFBE90 0%, #C69864 42%, #AF7E4A 84%, #8E6034 100%)';

const OAK_STILE_GRADIENT =
  'linear-gradient(90deg, #B58754 0%, #D7B385 45%, #A67847 100%)';

interface SlidingShelfRowProps {
  row: BookshelfRow;
  woodGrainFilterId: string;
  filterKey: string;
  prefersReducedMotion: boolean | null;
  getBookProgress: (bookId: string) => ReadingProgress | undefined;
  onOpenBook: (book: BookIndexEntry) => void;
}

function SlidingShelfRow({
  row,
  woodGrainFilterId,
  filterKey,
  prefersReducedMotion,
  getBookProgress,
  onOpenBook,
}: SlidingShelfRowProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollBounds = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    setCanScrollLeft(node.scrollLeft > 6);
    setCanScrollRight(node.scrollLeft < maxScroll - 6);
  }, []);

  // Al cambiar género, escritor o búsqueda, regresa suavemente al inicio de la repisa
  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    node.scrollTo({ left: 0, behavior: 'auto' });
    const raf = window.requestAnimationFrame(updateScrollBounds);
    return () => window.cancelAnimationFrame(raf);
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

  const handleSlide = (direction: -1 | 1) => {
    const node = trackRef.current;
    if (!node) return;
    const step = Math.max(220, Math.round(node.clientWidth * 0.65));
    node.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const isScrollable = canScrollLeft || canScrollRight;

  return (
    <div data-shelf-index={row.index} className="relative">
      {/* Zona de libros físicos iluminada dentro del nicho arquitectónico */}
      <div className="relative">
        {/* Luz cálida de galería descendiendo sobre las portadas */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 bottom-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 70% at 50% 10%, rgba(255,248,232,0.58) 0%, rgba(226,214,194,0.22) 60%, rgba(164,142,114,0.26) 100%)',
          }}
        />

        {/* Botón deslizante izquierdo (ubicado fuera del área de las portadas) */}
        {isScrollable && (
          <button
            type="button"
            data-testid={`shelf-prev-${row.index}`}
            aria-label="Desplazar libros hacia la izquierda"
            disabled={!canScrollLeft}
            onClick={() => handleSlide(-1)}
            className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF7F2]/95 border border-[#C7B69B] text-[#1A1917] shadow-[0_8px_18px_-6px_rgba(32,20,8,0.42)] hover:bg-[#1A1917] hover:text-[#FAF7F2] hover:border-[#1A1917] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
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
            onClick={() => handleSlide(1)}
            className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF7F2]/95 border border-[#C7B69B] text-[#1A1917] shadow-[0_8px_18px_-6px_rgba(32,20,8,0.42)] hover:bg-[#1A1917] hover:text-[#FAF7F2] hover:border-[#1A1917] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        )}

        {/* Carril horizontal deslizable con margen limpio para los controles laterales */}
        <div
          ref={trackRef}
          data-testid={`shelf-track-${row.index}`}
          className="book-perspective-stage relative z-10 mx-11 sm:mx-14 flex gap-5 sm:gap-6 lg:gap-7 items-end overflow-x-auto no-scrollbar pt-5 pb-0 px-1.5 sm:px-2"
        >
          {row.slots.map((slot, slotIndex) => (
            <BookVolume3D
              key={slot.book.id}
              book={slot.book}
              heightPx={slot.heightPx}
              physical={computePhysicalBookStyle(
                slot.book.pageCount,
                row.index,
                slotIndex,
              )}
              progress={getBookProgress(slot.book.id)}
              prefersReducedMotion={prefersReducedMotion}
              onOpen={onOpenBook}
            />
          ))}
        </div>
      </div>

      {/* Repisa de roble natural con tablero superior, canto frontal biselado y sombras */}
      <div className="relative">
        <div
          className="relative z-10 h-3.5 mx-0 sm:mx-1 rounded-t-[2px] overflow-hidden border-t border-[#F4E3CA]"
          style={{ background: OAK_DECK_GRADIENT }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-35"
            style={{ filter: `url(#${woodGrainFilterId})` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-6 bottom-0 h-1.5 bg-gradient-to-t from-[#3B2614]/28 to-transparent"
          />
        </div>

        <div
          className="relative z-20 h-[22px] w-full rounded-b-[2px] overflow-hidden border-t border-[#F7E9D2]/85 border-b border-[#7B522B]/60 shadow-[0_14px_24px_-6px_rgba(32,20,8,0.38)]"
          style={{ background: OAK_LIP_GRADIENT }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-45"
            style={{ filter: `url(#${woodGrainFilterId})` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-22"
            style={{
              backgroundImage:
                'repeating-linear-gradient(2deg, transparent, transparent 5px, rgba(84,48,18,0.22) 6px, transparent 8px)',
            }}
          />
        </div>

        {/* Sombra proyectada por la tabla sobre la pared interior del mueble */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-0 h-7 mx-1"
          style={{
            background:
              'linear-gradient(180deg, rgba(42,26,12,0.3) 0%, rgba(42,26,12,0.12) 45%, rgba(42,26,12,0) 100%)',
          }}
        />

        {/* Ménsulas laterales talladas */}
        <div className="pointer-events-none relative z-10 -mt-7 flex justify-between px-5 sm:px-10">
          <div
            aria-hidden="true"
            className="w-4 h-7 rounded-b-sm border-x border-b border-[#6C4928]/45 shadow-[4px_6px_10px_rgba(38,24,12,0.24)]"
            style={{
              background:
                'linear-gradient(90deg, #B58552 0%, #996C3E 55%, #7F562F 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="w-4 h-7 rounded-b-sm border-x border-b border-[#6C4928]/45 shadow-[4px_6px_10px_rgba(38,24,12,0.24)]"
            style={{
              background:
                'linear-gradient(90deg, #B58552 0%, #996C3E 55%, #7F562F 100%)',
            }}
          />
        </div>

        {/* Ramas orgánicas de olivo y eucalipto abrazando los costados exteriores */}
        <BotanicalBranchSvg
          side="left"
          variant={row.index % 2 === 0 ? 'olive-bracket' : 'eucalyptus-drape'}
          className="pointer-events-none absolute -left-5 sm:-left-8 -bottom-9 w-24 sm:w-36 lg:w-40 z-20"
        />
        <BotanicalBranchSvg
          side="right"
          variant={row.index % 2 === 0 ? 'eucalyptus-drape' : 'olive-bracket'}
          className="pointer-events-none absolute -right-5 sm:-right-8 -bottom-9 w-24 sm:w-36 lg:w-40 z-20"
        />
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

  const books = useMemo(() => getCatalogBooks(), []);
  const authors = useMemo(() => getAllAuthors(), []);
  const genres = useMemo(() => getAllGenres(books), [books]);

  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState<BookGenre | 'Todos'>('Todos');
  const [authorId, setAuthorId] = useState<string | 'Todos'>('Todos');
  const [selectedBook, setSelectedBook] = useState<BookIndexEntry | null>(null);
  const [readerNotice, setReaderNotice] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const shelfData = useMemo(
    () => buildSlidingShelves(books, { search, genre, authorId }),
    [books, search, genre, authorId],
  );

  const filterKey = `${search}__${genre}__${authorId}`;

  const resetFilters = () => {
    setSearch('');
    setGenre('Todos');
    setAuthorId('Todos');
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
      className="relative overflow-hidden bg-[#FAF7F2] pt-5 sm:pt-7 pb-10 sm:pb-14"
    >
      {/* Título accesible oculto visualmente para jerarquía semántica */}
      <h1 className="sr-only">LeerEsPensar — Biblioteca Editorial Libre</h1>

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

      {/* Textura mineral de pared arena */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ filter: `url(#${stuccoFilterId})` }}
      />

      {/* Haz de luz solar cálida */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,253,246,0.92) 0%, rgba(254,247,232,0.52) 32%, rgba(250,247,242,0) 62%, rgba(206,191,168,0.16) 100%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 space-y-5 sm:space-y-6">
        {/* Únicamente Buscador, Géneros y Escritores */}
        <div
          data-testid="bookshelf-filter-bar"
          className="max-w-4xl mx-auto bg-[#FAF7F2]/92 backdrop-blur-md border border-[#1A1917]/14 rounded-xl shadow-[0_12px_30px_-14px_rgba(40,28,16,0.18)]"
        >
          <div className="grid grid-cols-2 md:grid-cols-12 items-center divide-y md:divide-y-0 md:divide-x divide-[#1A1917]/10">
            <div className="col-span-2 md:col-span-5 relative">
              <label htmlFor="hero-search" className="sr-only">
                Buscar libro o escritor
              </label>
              <Search
                className="w-4 h-4 text-[#6B665E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="hero-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar libro o escritor..."
                className="w-full pl-10 pr-3 py-3 text-sm bg-transparent text-[#1A1917] placeholder:text-[#6B665E] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D97757]/40 rounded-t-xl md:rounded-l-xl md:rounded-tr-none"
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <label htmlFor="hero-genre" className="sr-only">
                Géneros
              </label>
              <select
                id="hero-genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value as BookGenre | 'Todos')}
                className="w-full px-3 py-3 text-xs sm:text-sm bg-transparent text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D97757]/40 cursor-pointer"
              >
                <option value="Todos">Géneros</option>
                {genres.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-4 flex items-center">
              <label htmlFor="hero-author" className="sr-only">
                Escritores
              </label>
              <select
                id="hero-author"
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full px-3 py-3 text-xs sm:text-sm bg-transparent text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D97757]/40 cursor-pointer rounded-br-xl md:rounded-r-xl"
              >
                <option value="Todos">Escritores</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>

              {shelfData.hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  aria-label="Limpiar filtros"
                  title="Limpiar filtros"
                  className="mr-2 p-2 text-[#B45335] hover:text-[#8E3C22] hover:bg-[#EFE8DC] rounded-lg transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {readerNotice && (
          <div
            role="status"
            className="max-w-4xl mx-auto flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-[#4A5D4E]/35 bg-[#4A5D4E]/10 text-xs sm:text-sm text-[#1A1917]"
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

        {/* Mueble-estantería arquitectónico en nicho cálido con pilares laterales de roble */}
        <div
          data-testid="botanical-bookshelf"
          className="relative rounded-2xl border border-[#DECFAF] bg-[#EFE7D8] shadow-[inset_0_16px_40px_-20px_rgba(42,26,12,0.22),0_22px_44px_-24px_rgba(42,26,12,0.28)] overflow-hidden"
        >
          {/* Moldura superior arquitectónica en roble */}
          <div
            aria-hidden="true"
            className="h-3.5 w-full border-b border-[#8F6438]/40 shadow-[0_6px_14px_rgba(42,26,12,0.18)]"
            style={{ background: OAK_LIP_GRADIENT }}
          />

          {/* Pilares verticales laterales del mueble */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-2.5 sm:w-3.5 z-30 border-r border-[#80552C]/35 shadow-[4px_0_12px_rgba(42,26,12,0.18)]"
            style={{ background: OAK_STILE_GRADIENT }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-2.5 sm:w-3.5 z-30 border-l border-[#80552C]/35 shadow-[-4px_0_12px_rgba(42,26,12,0.18)]"
            style={{ background: OAK_STILE_GRADIENT }}
          />

          {/* Interior de las repisas */}
          <div className="relative px-2 sm:px-3 pt-4 pb-3 space-y-6 sm:space-y-8">
            {shelfData.rows.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-3">
                <p className="font-serif text-xl text-[#1A1917]">
                  No encontramos ejemplares con ese filtro
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#1A1917] text-[#FAF7F2] rounded-lg hover:bg-[#32302C] transition-colors"
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
                />
              ))
            )}
          </div>

          {/* Zócalo inferior en roble */}
          <div
            aria-hidden="true"
            className="h-3 w-full border-t border-[#F4E3CA]"
            style={{ background: OAK_LIP_GRADIENT }}
          />
        </div>
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
