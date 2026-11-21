import { useState } from "react";
import { Heart } from "lucide-react";
import { BRAND_CONFIG } from "../config/brand";
import { SOCIAL_URL, displayUrl } from "../config/support";
import { useReadingProgress } from "../hooks/useReadingProgress";
import type { BookIndexEntry } from "../types/folio";
import {
  prepareVerifiedBookPdf,
  triggerPdfBytesDownload,
} from "../utils/bookPdfBuilder";
import { BotanicalBookshelfHero } from "./BotanicalBookshelfHero";
import { LampSwitch } from "./LampSwitch";
import { QrCode } from "./QrCode";
import { ImmersiveReader } from "./ImmersiveReader";
import { SupportModal } from "./SupportModal";
import { AdminGratitudModal } from "./AdminGratitudModal";
import { useGratitudeWall } from "../data/gratitud";

export interface Phase1FoundationViewProps {
  onReplayPreloader?: () => void;
}

export function Phase1FoundationView(_props: Phase1FoundationViewProps) {
  const { getBookProgress, updatePage, markBookCompleted } = useReadingProgress();

  const [activeReaderBook, setActiveReaderBook] = useState<BookIndexEntry | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  // Muro de gratitud: se lee una vez y lo comparten el pie, el cuadro de apoyo y el panel «adm».
  const { muro, setMuro } = useGratitudeWall();

  const handleStartBookReading = (book: BookIndexEntry) => {
    const existing = getBookProgress(book.id);
    const startPage = existing ? existing.currentPage : 1;
    updatePage(book.id, startPage, book.pageCount);
    setActiveReaderBook(book);
  };

  const handleDownloadBookPdf = async (book: BookIndexEntry): Promise<string | null> => {
    const prepared = await prepareVerifiedBookPdf(book);
    if (!prepared.validation.valid) {
      return `El ejemplar «${book.title}» no superó la verificación automática de seguridad.`;
    }
    const existing = getBookProgress(book.id);
    if (!existing) {
      updatePage(book.id, 1, book.pageCount);
    }
    triggerPdfBytesDownload(prepared.bytes, prepared.fileName);
    return `PDF descargado: «${prepared.fileName}» (${prepared.validation.details.pageCount ?? 1} págs.).`;
  };

  return (
    <div className="min-h-screen bg-[var(--room-page)] text-[var(--room-ink)] flex flex-col overflow-x-clip">
      {/* Cabecera en el mismo pergamino que la estantería: logo con la palabra "Es" en cursiva
          y un único botón de apoyo discreto. */}
      <header className="sticky top-0 z-30 bg-[var(--room-header)]/92 backdrop-blur-md border-b border-[var(--room-line)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            aria-label={`${BRAND_CONFIG.name}, ir al inicio`}
            className="font-serif text-[1.35rem] sm:text-[1.6rem] font-medium tracking-tight text-[var(--room-ink)] whitespace-nowrap shrink-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--room-header)] rounded-sm"
          >
            Leer<em className="italic font-normal text-[var(--room-accent)] px-[1px]">Es</em>Pensar
          </a>

          <nav aria-label="Navegación principal" className="flex items-center gap-3 sm:gap-6 text-sm">
            <button
              type="button"
              data-testid="nav-support-btn"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--room-accent)]/40 px-3.5 py-1.5 text-[13px] font-medium text-[var(--room-accent)] hover:bg-[var(--room-accent)] hover:text-[var(--room-page)] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--room-header)]"
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Apoya este proyecto</span>
              <span className="sm:hidden">Apoyar</span>
            </button>
            <LampSwitch />
          </nav>
        </div>
      </header>

      <main id="top" className="flex-1">
        <BotanicalBookshelfHero
          getBookProgress={getBookProgress}
          onStartBookReading={handleStartBookReading}
          onDownloadBookPdf={handleDownloadBookPdf}
        />
      </main>

      {/* Pie como colofón: la nota final de los libros impresos. */}
      <footer className="bg-[var(--room-footer)] border-t border-[var(--room-ink-soft)]/25 text-[var(--room-ink-soft)]">
        <div className="max-w-5xl mx-auto px-6 py-10 sm:py-12 grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div className="text-center md:text-left">
            <p aria-hidden="true" className="font-serif text-2xl text-[var(--room-ink-soft)]/70 leading-none">
              ❦
            </p>
            <p className="mt-5 font-serif italic text-lg sm:text-xl text-[var(--room-ink)] leading-snug">
              Hecha en {BRAND_CONFIG.location}, para que leer siga siendo gratis.
            </p>
            {muro.length > 0 && (
              <p className="mt-2 text-[13px]" data-testid="footer-gratitud">
                Gracias a{' '}
                <span className="font-serif italic text-[var(--room-ink)]">
                  {muro.slice(0, 3).map((e) => e.nombre).join(' · ')}
                </span>{' '}
                y a quienes sostienen esta biblioteca.
              </p>
            )}
            <nav
              aria-label="Enlaces del pie"
              className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-2 text-[13px]"
            >
              <span>
                Una biblioteca de{' '}
                <a
                  href={BRAND_CONFIG.authorSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--room-ink)] underline decoration-[var(--room-accent)]/40 underline-offset-4 hover:decoration-[var(--room-accent)] transition-colors"
                >
                  {BRAND_CONFIG.creator}
                </a>
              </span>
              <span aria-hidden="true" className="text-[var(--room-ink-soft)]/50">·</span>
              <a
                href={`mailto:${BRAND_CONFIG.contactEmail}`}
                title={BRAND_CONFIG.contactEmail}
                className="hover:text-[var(--room-ink)] transition-colors"
              >
                Escríbenos
              </a>
              <span aria-hidden="true" className="text-[var(--room-ink-soft)]/50">·</span>
              {/* Acceso discreto del administrador (requiere su propio código) */}
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                data-testid="footer-adm"
                className="text-[12px] text-[var(--room-ink-soft)]/70 underline decoration-dotted underline-offset-4 hover:text-[var(--room-ink)] transition-colors"
              >
                adm
              </button>
            </nav>
          </div>

          {/* QR de redes: a un lado en escritorio, debajo en móvil */}
          <a
            href={SOCIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="footer-social-qr"
            className="group mx-auto md:mx-0 flex items-center gap-4 rounded-2xl border border-[var(--room-line)] bg-[var(--room-field)]/60 p-3 pr-5 hover:bg-[var(--room-field)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
          >
            <QrCode
              value={SOCIAL_URL}
              label="Código QR de mis redes sociales"
              className="w-24 h-24 rounded-lg"
            />
            <span className="text-left">
              <span className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--room-ink-soft)]">
                Mis redes
              </span>
              <span className="block mt-1 font-serif text-lg text-[var(--room-ink)]">Sígueme</span>
              <span className="block mt-0.5 text-xs text-[var(--room-ink-soft)] group-hover:text-[var(--room-accent)] transition-colors">
                {displayUrl(SOCIAL_URL)} →
              </span>
            </span>
          </a>
        </div>
      </footer>

      <ImmersiveReader
        book={activeReaderBook}
        progress={activeReaderBook ? getBookProgress(activeReaderBook.id) : undefined}
        onUpdatePage={updatePage}
        onMarkCompleted={markBookCompleted}
        onClose={() => setActiveReaderBook(null)}
      />

      <AdminGratitudModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        muro={muro}
        onMuroChange={setMuro}
      />

      <SupportModal
        muro={muro}
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
}
