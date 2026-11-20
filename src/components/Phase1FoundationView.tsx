import { useState } from 'react';
import { Heart, LogOut, Mail } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useAuth } from '../contexts/AuthContext';
import { useReadingProgress } from '../hooks/useReadingProgress';
import type { BookIndexEntry } from '../types/folio';
import {
  prepareVerifiedBookPdf,
  triggerPdfBytesDownload,
} from '../utils/bookPdfBuilder';
import { BotanicalBookshelfHero } from './BotanicalBookshelfHero';
import { ImmersiveReader } from './ImmersiveReader';
import { SupportModal } from './SupportModal';

export interface Phase1FoundationViewProps {
  onReplayPreloader?: () => void;
}

export function Phase1FoundationView({ onReplayPreloader }: Phase1FoundationViewProps) {
  const { user, authReady, signingIn, authError, signInWithGoogle, signOutReader } = useAuth();

  // Persistencia de lectura y validación estructural PDF corriendo silenciosamente en segundo plano
  const {
    getBookProgress,
    updatePage,
    markBookCompleted,
  } = useReadingProgress({
    userId: user?.uid ?? null,
    authReady,
  });

  const [activeReaderBook, setActiveReaderBook] = useState<BookIndexEntry | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);

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
    <div className="min-h-screen bg-[#FAF7F2] text-[#1A1917] flex flex-col overflow-x-clip">
      {/* Top Bar Contract: exactamente 3 zonas separadas */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E6DFD3]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-serif text-2xl font-semibold tracking-tight text-[#1A1917] whitespace-nowrap shrink-0"
          >
            {BRAND_CONFIG.name}
          </a>

          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B665E]"
          >
            <a
              href="#biblioteca"
              className="hover:text-[#1A1917] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
            >
              Biblioteca
            </a>
            <button
              type="button"
              data-testid="nav-support-btn"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#4A5D4E] hover:text-[#B45335] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              Apoya este proyecto libre
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => void signOutReader()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#1A1917] bg-[#F3EFE8] border border-[#E6DFD3] rounded-lg hover:bg-[#EAE3D7] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="max-w-[140px] truncate">{user.displayName || 'Lector'}</span>
                <LogOut className="w-3.5 h-3.5 text-[#6B665E]" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={signingIn}
                className="px-4 py-2 text-xs font-medium text-[#FAF8F5] bg-[#1A1917] rounded-lg hover:bg-[#32302C] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {signingIn ? 'Conectando...' : 'Entrar con Google'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {authError && (
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <div
              role="alert"
              className="border border-[#D97757]/50 bg-[#D97757]/10 rounded-xl px-4 py-3 text-sm text-[#7A2E16]"
            >
              {authError}
            </div>
          </div>
        )}

        {/* Estantería principal con buscador, géneros, escritores y desplazamiento lateral */}
        <BotanicalBookshelfHero
          getBookProgress={getBookProgress}
          onStartBookReading={handleStartBookReading}
          onDownloadBookPdf={handleDownloadBookPdf}
        />
      </main>

      <footer className="border-t border-[#E6DFD3] py-6 px-6 text-xs text-[#6B665E]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {BRAND_CONFIG.name} · {BRAND_CONFIG.location}
            </span>
            <span aria-hidden="true">·</span>
            <a
              href={BRAND_CONFIG.authorSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1A1917] hover:text-[#B45335] underline underline-offset-4 transition-colors"
            >
              {BRAND_CONFIG.creator}
            </a>
            <span aria-hidden="true">·</span>
            <a
              href={BRAND_CONFIG.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1A1917] underline underline-offset-4 transition-colors"
            >
              Repositorio abierto
            </a>
            <a
              href={`mailto:${BRAND_CONFIG.contactEmail}`}
              className="inline-flex items-center gap-1 hover:text-[#1A1917] underline underline-offset-4 transition-colors"
            >
              <Mail className="w-3 h-3" aria-hidden="true" />
              {BRAND_CONFIG.contactEmail}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              data-testid="footer-support-btn"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#4A5D4E] hover:text-[#B45335] underline underline-offset-4 transition-colors"
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              Apoya este proyecto libre
            </button>
            {onReplayPreloader && (
              <button
                type="button"
                onClick={onReplayPreloader}
                className="text-[#1A1917] hover:text-[#B45335] underline underline-offset-4 transition-colors"
              >
                Repetir lluvia de escritores
              </button>
            )}
          </div>
        </div>
      </footer>

      <ImmersiveReader
        book={activeReaderBook}
        progress={activeReaderBook ? getBookProgress(activeReaderBook.id) : undefined}
        onUpdatePage={updatePage}
        onMarkCompleted={markBookCompleted}
        onClose={() => setActiveReaderBook(null)}
      />

      <SupportModal
        open={supportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </div>
  );
}
