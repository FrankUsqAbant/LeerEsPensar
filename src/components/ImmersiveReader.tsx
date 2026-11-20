import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileCheck2,
  Minus,
  Moon,
  Plus,
  Share2,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { getBookEditionContent } from '../data/bookEditions';
import type {
  BookIndexEntry,
  PdfValidationResult,
  ReadingProgress,
} from '../types/folio';
import {
  prepareVerifiedBookPdf,
  triggerPdfBytesDownload,
} from '../utils/bookPdfBuilder';
import { ShareAchievementModal } from './ShareAchievementModal';

type ReaderTheme = 'light' | 'sepia' | 'night';
type ReaderMode = 'editorial' | 'pdf-preview';

export interface ImmersiveReaderProps {
  book: BookIndexEntry | null;
  progress: ReadingProgress | undefined;
  onUpdatePage: (bookId: string, currentPage: number, totalPages: number) => void;
  onMarkCompleted: (bookId: string, totalPages: number, completed: boolean) => void;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImmersiveReader({
  book,
  progress,
  onUpdatePage,
  onMarkCompleted,
  onClose,
}: ImmersiveReaderProps) {
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [fontSizePx, setFontSizePx] = useState(18);
  const [viewMode, setViewMode] = useState<ReaderMode>('editorial');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfValidation, setPdfValidation] = useState<PdfValidationResult | null>(null);
  const [preparingPdf, setPreparingPdf] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const [pdfPreviewPage, setPdfPreviewPage] = useState(1);
  const [pdfPreviewTotalPages, setPdfPreviewTotalPages] = useState(1);
  const [renderingPdfCanvas, setRenderingPdfCanvas] = useState(false);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shareOpen, setShareOpen] = useState(false);

  const edition = useMemo(() => (book ? getBookEditionContent(book) : null), [book]);

  // Prepara y verifica el PDF automáticamente en segundo plano al abrir el libro
  useEffect(() => {
    if (!book) return;
    let active = true;
    setPdfBytes(null);
    setPdfValidation(null);
    setDownloadStatus(null);
    setPdfPreviewPage(1);
    setActiveSectionIndex(0);

    const prepare = async () => {
      setPreparingPdf(true);
      try {
        const prepared = await prepareVerifiedBookPdf(book);
        if (!active) return;
        setPdfBytes(prepared.bytes);
        setPdfFileName(prepared.fileName);
        setPdfValidation(prepared.validation);
        setPdfPreviewTotalPages(prepared.validation.details.pageCount ?? 1);
      } finally {
        if (active) setPreparingPdf(false);
      }
    };
    void prepare();

    return () => {
      active = false;
    };
  }, [book]);

  // Renderizado aislado del PDF real en canvas cuando el lector cambia a "Vista previa PDF real"
  useEffect(() => {
    if (!book || viewMode !== 'pdf-preview' || !pdfBytes || !pdfCanvasRef.current) return;
    let cancelled = false;
    let activeTask: { destroy: () => Promise<void> } | null = null;

    const renderPage = async () => {
      setRenderingPdfCanvas(true);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const task = pdfjsLib.getDocument({
          data: pdfBytes.slice(),
          disableAutoFetch: true,
          enableXfa: false,
          stopAtErrors: true,
          verbosity: 0,
        });
        activeTask = task;
        const doc = await task.promise;
        if (cancelled) {
          await doc.cleanup();
          await task.destroy();
          return;
        }
        const safePageNum = Math.min(Math.max(1, pdfPreviewPage), doc.numPages);
        setPdfPreviewTotalPages(doc.numPages);

        const page = await doc.getPage(safePageNum);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = pdfCanvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          if (context) {
            await page.render({
              canvasContext: context,
              canvas,
              viewport,
            }).promise;
          }
        }
        await doc.cleanup();
        await task.destroy();
      } catch {
        // Fallback silencioso: la vista editorial permanece accesible.
      } finally {
        if (!cancelled) setRenderingPdfCanvas(false);
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      if (activeTask) {
        void activeTask.destroy().catch(() => undefined);
      }
    };
  }, [book, viewMode, pdfBytes, pdfPreviewPage]);

  useEffect(() => {
    if (!book) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !shareOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [book, shareOpen, onClose]);

  if (!book || !edition) return null;

  const currentPage = progress?.currentPage ?? 1;
  const percentage = progress?.percentage ?? 1;
  const totalSections = edition.sections.length;
  const currentSection = edition.sections[activeSectionIndex] ?? edition.sections[0];

  const handleDownloadVerifiedPdf = async () => {
    setPreparingPdf(true);
    setDownloadStatus(null);
    try {
      let bytes = pdfBytes;
      let fileName = pdfFileName;
      let validation = pdfValidation;

      if (!bytes || !validation) {
        const prepared = await prepareVerifiedBookPdf(book);
        bytes = prepared.bytes;
        fileName = prepared.fileName;
        validation = prepared.validation;
        setPdfBytes(bytes);
        setPdfFileName(fileName);
        setPdfValidation(validation);
      }

      if (!validation.valid) {
        setDownloadStatus(
          `Descarga bloqueada por seguridad: ${validation.userMessage}`,
        );
        return;
      }

      triggerPdfBytesDownload(bytes, fileName);
      setDownloadStatus(
        `Descargado «${fileName}» (${validation.details.pageCount ?? 1} págs. verificadas).`,
      );
    } finally {
      setPreparingPdf(false);
    }
  };

  const handleStepSection = (delta: number) => {
    const nextIndex = Math.min(totalSections - 1, Math.max(0, activeSectionIndex + delta));
    setActiveSectionIndex(nextIndex);
    const mappedPage = Math.max(
      1,
      Math.round(((nextIndex + 1) / totalSections) * book.pageCount),
    );
    onUpdatePage(book.id, mappedPage, book.pageCount);
  };

  const handleFinishBook = () => {
    onMarkCompleted(book.id, book.pageCount, true);
    setShareOpen(true);
  };

  const themeClasses: Record<ReaderTheme, string> = {
    light: 'bg-[#FAF8F5] text-[#1A1917]',
    sepia: 'bg-[#F4ECDC] text-[#241E17]',
    night: 'bg-[#171614] text-[#EAE4DA]',
  };

  const barClasses: Record<ReaderTheme, string> = {
    light: 'bg-[#F3EFE8] border-[#E6DFD3]',
    sepia: 'bg-[#EBE0CB] border-[#DCD0B8]',
    night: 'bg-[#201E1B] border-[#36322C]',
  };

  const mutedText = theme === 'night' ? 'text-[#B5AEA3]' : 'text-[#6B665E]';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Lector y descarga PDF de ${book.title}`}
      data-testid="immersive-reader"
      className={`fixed inset-0 z-40 flex flex-col overflow-hidden transition-colors duration-200 ${themeClasses[theme]}`}
    >
      {/* Barra fina superior de progreso de lectura */}
      <div className="h-1 w-full bg-current/10 shrink-0">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: progress?.completed ? '#4A5D4E' : '#D97757',
          }}
        />
      </div>

      {/* Cabecera de control de lectura y descarga PDF */}
      <header className={`border-b px-4 sm:px-6 py-3 shrink-0 ${barClasses[theme]}`}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-[11px] truncate ${mutedText}`}>
              {book.authorName} · Pág. {currentPage} de {book.pageCount} ({percentage}%)
            </p>
            <h2 className="font-serif text-lg sm:text-xl font-medium truncate">
              {book.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botón principal de descarga PDF verificada */}
            <button
              type="button"
              data-testid="reader-download-pdf"
              onClick={() => void handleDownloadVerifiedPdf()}
              disabled={preparingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium bg-[#B45335] text-[#FAF8F5] rounded-lg hover:bg-[#994227] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {preparingPdf ? 'Verificando PDF...' : 'Descargar PDF'}
            </button>

            {/* Modos de lectura: Claro / Sepia / Noche */}
            <div
              className="flex items-center rounded-lg border border-current/15 overflow-hidden"
              role="group"
              aria-label="Tema de lectura"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-label="Modo claro"
                aria-pressed={theme === 'light'}
                className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${
                  theme === 'light' ? 'bg-[#1A1917] text-[#FAF8F5]' : 'hover:bg-current/5'
                }`}
              >
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('sepia')}
                aria-label="Modo sepia"
                aria-pressed={theme === 'sepia'}
                className={`px-2.5 py-1.5 text-xs ${
                  theme === 'sepia' ? 'bg-[#1A1917] text-[#FAF8F5]' : 'hover:bg-current/5'
                }`}
              >
                Sepia
              </button>
              <button
                type="button"
                onClick={() => setTheme('night')}
                aria-label="Modo noche"
                aria-pressed={theme === 'night'}
                className={`px-2.5 py-1.5 text-xs inline-flex items-center gap-1 ${
                  theme === 'night' ? 'bg-[#FAF8F5] text-[#1A1917]' : 'hover:bg-current/5'
                }`}
              >
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Noche</span>
              </button>
            </div>

            {/* Tamaño tipográfico */}
            <div
              className="hidden sm:flex items-center rounded-lg border border-current/15 overflow-hidden"
              role="group"
              aria-label="Tamaño de letra"
            >
              <button
                type="button"
                onClick={() => setFontSizePx((s) => Math.max(15, s - 2))}
                aria-label="Reducir tamaño de letra"
                className="px-2 py-1.5 hover:bg-current/5"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <span className="px-2 text-xs tabular-nums">{fontSizePx}px</span>
              <button
                type="button"
                onClick={() => setFontSizePx((s) => Math.min(24, s + 2))}
                aria-label="Aumentar tamaño de letra"
                className="px-2 py-1.5 hover:bg-current/5"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar lector"
              className="p-2 rounded-lg hover:bg-current/10 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Área principal de descarga verificada y lectura */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Módulo destacado de Descarga PDF Segura */}
          <section
            aria-label="Centro de descarga PDF verificado"
            className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${barClasses[theme]}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A5D4E]">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  Edición PDF lista para descargar sin riesgos
                </p>
                <h3 className="font-serif text-xl font-medium">
                  {pdfFileName || `${book.slug}-LeerEsPensar.pdf`}
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {edition.editionNote}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleDownloadVerifiedPdf()}
                disabled={preparingPdf}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium bg-[#1A1917] text-[#FAF8F5] rounded-xl hover:bg-[#32302C] disabled:opacity-60 transition-colors shrink-0 whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                {preparingPdf ? 'Preparando ejemplar...' : 'Descargar PDF ahora'}
              </button>
            </div>

            {pdfValidation && (
              <div className="pt-3 border-t border-current/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#4A5D4E]">
                  <FileCheck2 className="w-4 h-4" aria-hidden="true" />
                  Verificado con PDF.js ({pdfValidation.details.pageCount ?? 1} págs. ·{' '}
                  {formatBytes(pdfValidation.details.fileSizeBytes)} · firma %PDF-
                  {pdfValidation.details.pdfVersion})
                </span>
                {pdfValidation.details.sha256 && (
                  <span className={`font-mono text-[11px] tabular-nums ${mutedText}`}>
                    SHA-256: {pdfValidation.details.sha256.slice(0, 14)}…
                  </span>
                )}
              </div>
            )}

            {downloadStatus && (
              <p
                role="status"
                data-testid="pdf-download-status"
                className="text-xs font-medium text-[#4A5D4E]"
              >
                {downloadStatus}
              </p>
            )}

            {/* Selector entre lectura editorial fluida o vista previa renderizada del PDF real */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewMode('editorial')}
                aria-pressed={viewMode === 'editorial'}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  viewMode === 'editorial'
                    ? 'bg-[#4A5D4E] text-[#FAF8F5] border-[#4A5D4E]'
                    : 'border-current/20 hover:bg-current/5'
                }`}
              >
                Lectura editorial adaptativa
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf-preview')}
                aria-pressed={viewMode === 'pdf-preview'}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  viewMode === 'pdf-preview'
                    ? 'bg-[#4A5D4E] text-[#FAF8F5] border-[#4A5D4E]'
                    : 'border-current/20 hover:bg-current/5'
                }`}
              >
                Vista previa del PDF real
              </button>
            </div>
          </section>

          {/* Contenido de lectura o canvas PDF.js */}
          {viewMode === 'pdf-preview' ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className={mutedText}>
                  Renderizado aislado con PDF.js (scripts deshabilitados)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pdfPreviewPage <= 1}
                    onClick={() => setPdfPreviewPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-current/20 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="tabular-nums">
                    Página {pdfPreviewPage} de {pdfPreviewTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={pdfPreviewPage >= pdfPreviewTotalPages}
                    onClick={() =>
                      setPdfPreviewPage((p) => Math.min(pdfPreviewTotalPages, p + 1))
                    }
                    className="px-2.5 py-1 rounded border border-current/20 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-current/15 overflow-hidden bg-white p-2 sm:p-4 flex flex-col items-center justify-center">
                {renderingPdfCanvas && (
                  <p className="py-6 text-sm text-[#6B665E]">
                    Renderizando página del PDF...
                  </p>
                )}
                <canvas
                  ref={pdfCanvasRef}
                  data-testid="pdf-preview-canvas"
                  className={`max-w-full h-auto shadow-sm ${
                    renderingPdfCanvas ? 'opacity-40' : 'opacity-100'
                  }`}
                />
              </div>
            </section>
          ) : (
            <article className="space-y-6">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={mutedText}>
                  Pasaje {activeSectionIndex + 1} de {totalSections}
                </span>
                <div className="flex items-center gap-1.5">
                  {edition.sections.map((section, idx) => (
                    <button
                      key={section.title}
                      type="button"
                      onClick={() => {
                        setActiveSectionIndex(idx);
                        const mapped = Math.max(
                          1,
                          Math.round(((idx + 1) / totalSections) * book.pageCount),
                        );
                        onUpdatePage(book.id, mapped, book.pageCount);
                      }}
                      className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                        idx === activeSectionIndex
                          ? 'bg-[#D97757] text-[#FAF8F5] border-[#D97757]'
                          : 'border-current/15 hover:bg-current/5'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-medium leading-tight">
                {currentSection.title}
              </h3>

              <div
                className="font-serif leading-[1.85] space-y-5"
                style={{ fontSize: `${fontSizePx}px` }}
              >
                {currentSection.paragraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              {activeSectionIndex === totalSections - 1 && (
                <blockquote className="p-5 rounded-xl border border-current/15 italic font-serif text-base">
                  «{edition.closingReflection}»
                </blockquote>
              )}

              {/* Controles de navegación y finalización */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-current/15">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeSectionIndex === 0}
                    onClick={() => handleStepSection(-1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-current/20 disabled:opacity-40 hover:bg-current/5"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={activeSectionIndex >= totalSections - 1}
                    onClick={() => handleStepSection(1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-current/20 disabled:opacity-40 hover:bg-current/5"
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-current/20 hover:bg-current/5"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                    Tarjeta compartible
                  </button>

                  <button
                    type="button"
                    data-testid="mark-book-finished-btn"
                    onClick={handleFinishBook}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium bg-[#4A5D4E] text-[#FAF8F5] rounded-lg hover:bg-[#3A4B3E] transition-colors"
                  >
                    {progress?.completed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        ¡Libro Terminado!
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" aria-hidden="true" />
                        ¡Libro Terminado!
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          )}

        </div>
      </div>

      <ShareAchievementModal
        book={book}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
