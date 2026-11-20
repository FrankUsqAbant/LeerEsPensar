import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, Copy, Download, Share2, X } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useAuth } from '../contexts/AuthContext';
import { getBookEditionContent } from '../data/bookEditions';
import type { BookIndexEntry } from '../types/folio';
import { isSafeHttpUrl, sanitizePlainText } from '../utils/sanitization';
import {
  downloadAchievementCardPng,
  drawAchievementCardToCanvas,
} from '../utils/shareCardCanvas';

export interface ShareAchievementModalProps {
  book: BookIndexEntry | null;
  open: boolean;
  onClose: () => void;
}

export function ShareAchievementModal({
  book,
  open,
  onClose,
}: ShareAchievementModalProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [quote, setQuote] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (book && open) {
      const edition = getBookEditionContent(book);
      setQuote(edition.closingReflection);
      setCopied(false);
    }
  }, [book, open]);

  useEffect(() => {
    if (!open || !book || !canvasRef.current) return;
    drawAchievementCardToCanvas(canvasRef.current, {
      book,
      readerName: user?.displayName ?? 'Lector de la comunidad',
      quote: quote || book.hookSummary,
    });
  }, [open, book, user?.displayName, quote]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const shareText = useMemo(() => {
    if (!book) return '';
    const cleanQuote = sanitizePlainText(quote || book.hookSummary, 160);
    return `Acabo de leer «${book.title}» de ${book.authorName} en ${BRAND_CONFIG.name}. ${cleanQuote}`;
  }, [book, quote]);

  const facebookShareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !book) return 'https://www.facebook.com';
    const currentUrl = window.location.origin;
    const targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      currentUrl,
    )}&quote=${encodeURIComponent(shareText)}`;
    return isSafeHttpUrl(targetUrl) ? targetUrl : 'https://www.facebook.com';
  }, [book, shareText]);

  if (!open || !book) return null;

  const handleCopyShare = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      await navigator.clipboard.writeText(`${shareText} — ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadCard = () => {
    if (!canvasRef.current) return;
    downloadAchievementCardPng(canvasRef.current, book.slug);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-achievement-title"
      data-testid="share-achievement-modal"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1A1917]/65 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#F3EFE8] border-b border-[#E6DFD3]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#4A5D4E]">
            <Award className="w-4 h-4" aria-hidden="true" />
            <span>Lectura completada en {BRAND_CONFIG.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar tarjeta compartible"
            className="p-2 text-[#6B665E] hover:text-[#1A1917] rounded-lg"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2
              id="share-achievement-title"
              className="font-serif text-2xl sm:text-3xl font-medium text-[#1A1917]"
            >
              Tu tarjeta editorial de «{book.title}»
            </h2>
            <p className="text-sm text-[#6B665E] mt-1">
              Personaliza la frase que acompaña tu logro, descárgala en alta definición o compártela en Facebook.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-[#E6DFD3] bg-[#F3EFE8]">
            <canvas
              ref={canvasRef}
              data-testid="achievement-card-canvas"
              className="w-full h-auto block"
            />
          </div>

          <div>
            <label
              htmlFor="achievement-quote-input"
              className="block text-xs font-medium text-[#6B665E] mb-1.5"
            >
              Frase o impresión para tu tarjeta
            </label>
            <input
              id="achievement-quote-input"
              type="text"
              maxLength={220}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-[#F3EFE8] border border-[#E6DFD3] rounded-lg text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6DFD3]">
            <button
              type="button"
              onClick={handleDownloadCard}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Descargar tarjeta PNG
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#4A5D4E] text-[#FAF8F5] rounded-lg hover:bg-[#3B4C3F] transition-colors"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                Compartir en Facebook
              </a>

              <button
                type="button"
                onClick={() => void handleCopyShare()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#F3EFE8] border border-[#E6DFD3] text-[#1A1917] rounded-lg hover:bg-[#EAE3D7] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#4A5D4E]" aria-hidden="true" />
                    Enlace copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copiar enlace
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
