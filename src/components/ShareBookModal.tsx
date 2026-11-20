import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { BookIndexEntry } from '../types/folio';
import {
  buildShareCaption,
  canvasToPngBlob,
  drawBookShareCard,
  ensureShareCardFonts,
  shareCardFileName,
} from '../utils/bookShareCard';

export interface ShareBookModalProps {
  book: BookIndexEntry | null;
  open: boolean;
  onClose: () => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function siteUrl(): string {
  return typeof window === 'undefined' ? '' : `${window.location.origin}/`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Compartir un libro en Facebook (muro o fan page) con una tarjeta bonita:
 * imagen 1080×1350 + texto listo para pegar. En el celular usa el menú de compartir
 * del sistema; en la computadora, descargar + copiar + abrir Facebook.
 */
export function ShareBookModal({ book, open, onClose }: ShareBookModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  const caption = useMemo(() => (book ? buildShareCaption(book, siteUrl()) : ''), [book]);

  // Dibuja la tarjeta cuando se abre (con las fuentes de la página ya cargadas).
  useEffect(() => {
    if (!open || !book) return;
    let cancelled = false;
    setStatus(null);
    setCopied(false);
    setPreviewUrl(null);
    void (async () => {
      await ensureShareCardFonts();
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvasRef.current = canvas;
      drawBookShareCard(canvas, book, window.location.host);
      if (cancelled) return;
      setPreviewUrl(canvas.toDataURL('image/png'));
      const blob = await canvasToPngBlob(canvas);
      if (!blob || cancelled) return;
      const file = new File([blob], shareCardFileName(book), { type: 'image/png' });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [file] })));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, book]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!book) return null;

  const handleCopy = async () => {
    const ok = await copyText(caption);
    setCopied(ok);
    setStatus(ok ? 'Texto copiado. Pégalo en tu publicación.' : 'No se pudo copiar: selecciona el texto y cópialo.');
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = shareCardFileName(book);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStatus('Imagen descargada.');
  };

  // Celular: menú del sistema (Facebook, Páginas, WhatsApp…). El texto se copia antes.
  const handleNativeShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasToPngBlob(canvas);
    if (!blob) return;
    const file = new File([blob], shareCardFileName(book), { type: 'image/png' });
    const copiedOk = await copyText(caption);
    setCopied(copiedOk);
    try {
      await navigator.share({ files: [file], title: book.title, text: caption });
      setStatus(copiedOk ? 'Listo. Si Facebook no muestra el texto, pégalo: ya está copiado.' : 'Listo.');
    } catch {
      setStatus(copiedOk ? 'Texto copiado por si lo necesitas.' : null);
    }
  };

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl())}`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.4, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-[#1A1917]/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-book-title"
            data-testid="share-book-modal"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="relative w-full max-w-3xl my-auto rounded-2xl bg-[var(--room-page)] text-[var(--room-ink)] border border-[var(--room-line)] shadow-[0_40px_80px_-30px_rgba(20,12,4,0.55)] grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] overflow-hidden"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar compartir"
              className="absolute top-3 right-3 z-10 p-2 rounded-full text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-field)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Vista previa de la tarjeta */}
            <div className="bg-[var(--room-shelf)] p-5 sm:p-7 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`Tarjeta para compartir «${book.title}»`}
                  className="w-full max-w-[17rem] md:max-w-none rounded-lg shadow-[0_20px_40px_-20px_rgba(30,18,6,0.6)]"
                />
              ) : (
                <div className="w-full max-w-[17rem] aspect-[4/5] rounded-lg bg-[var(--room-field)] animate-pulse" />
              )}
            </div>

            {/* Acciones */}
            <div className="p-6 sm:p-8 flex flex-col">
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--room-ink-soft)]">
                Comparte este libro
              </p>
              <h2 id="share-book-title" className="mt-1 font-serif text-2xl sm:text-[1.9rem] leading-tight pr-8">
                {book.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--room-ink-soft)] leading-relaxed">
                Una tarjeta lista para tu muro o la fan page de Facebook, con su frase de apertura.
              </p>

              <div className="mt-6 space-y-2.5">
                {canShareFiles && (
                  <button
                    type="button"
                    onClick={() => void handleNativeShare()}
                    data-testid="share-native"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[var(--room-ink)] text-[var(--room-page)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    Compartir imagen
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={!previewUrl}
                    data-testid="share-download"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[var(--room-line)] bg-[var(--room-field)] text-sm hover:bg-[var(--room-page)] disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Descargar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    data-testid="share-copy"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[var(--room-line)] bg-[var(--room-field)] text-sm hover:bg-[var(--room-page)] transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    {copied ? 'Copiado' : 'Copiar texto'}
                  </button>
                </div>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="share-facebook"
                  onClick={() => void copyText(caption).then(setCopied)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166FE5] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
                    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                  </svg>
                  Abrir Facebook
                </a>
              </div>

              <p role="status" className="mt-3 min-h-[1.25rem] text-xs text-[var(--room-accent)]">
                {status}
              </p>

              <details className="mt-auto pt-3 text-xs text-[var(--room-ink-soft)]">
                <summary className="cursor-pointer select-none hover:text-[var(--room-ink)]">
                  Cómo publicarlo en tu fan page
                </summary>
                <ol className="mt-2 space-y-1 list-decimal pl-4 leading-relaxed">
                  <li>Descarga la imagen (o usa «Compartir imagen» en el celular).</li>
                  <li>Copia el texto: incluye la frase, el enlace y los hashtags.</li>
                  <li>En Facebook, publica desde tu página: agrega la foto y pega el texto.</li>
                </ol>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-[11px] leading-relaxed bg-[var(--room-field)] border border-[var(--room-line)] rounded-lg p-3 max-h-36 overflow-y-auto">
                  {caption}
                </pre>
              </details>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
