import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ShieldCheck, X } from 'lucide-react';
import type { PdfValidationResult } from '../types/folio';
import { triggerPdfBytesDownload } from '../utils/bookPdfBuilder';

export interface VerifiedLocalPdfModalProps {
  open: boolean;
  bytes: Uint8Array | null;
  validation: PdfValidationResult | null;
  onClose: () => void;
}

export function VerifiedLocalPdfModal({
  open,
  bytes,
  validation,
  onClose,
}: VerifiedLocalPdfModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPageNumber(1);
    setTotalPages(validation?.details.pageCount ?? 1);
    setRenderError(null);
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, validation, onClose]);

  useEffect(() => {
    if (!open || !bytes || !canvasRef.current) return;
    let cancelled = false;
    let activeTask: { destroy: () => Promise<void> } | null = null;

    const render = async () => {
      setRendering(true);
      setRenderError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        const task = pdfjsLib.getDocument({
          data: bytes.slice(),
          disableAutoFetch: true,
          enableXfa: false,
          stopAtErrors: true,
          verbosity: 0,
        });
        activeTask = task;

        const pdfDoc = await task.promise;
        if (cancelled) {
          await pdfDoc.cleanup();
          await task.destroy();
          return;
        }

        const safePage = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
        setTotalPages(pdfDoc.numPages);

        const page = await pdfDoc.getPage(safePage);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = canvasRef.current;
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

        await pdfDoc.cleanup();
        await task.destroy();
      } catch {
        if (!cancelled) {
          setRenderError('No pudimos renderizar esta página en el visor seguro.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    void render();
    return () => {
      cancelled = true;
      if (activeTask) {
        void activeTask.destroy().catch(() => undefined);
      }
    };
  }, [open, bytes, pageNumber]);

  if (!open || !bytes || !validation?.valid) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verified-local-pdf-title"
      data-testid="verified-local-pdf-modal"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#1A1917]/65 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        <div className="px-5 sm:px-6 py-4 bg-[#F3EFE8] border-b border-[#E6DFD3] flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A5D4E]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Visor PDF aislado · JavaScript deshabilitado
            </p>
            <h3
              id="verified-local-pdf-title"
              className="font-serif text-lg sm:text-xl font-medium text-[#1A1917] truncate"
            >
              {validation.details.fileName}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerPdfBytesDownload(bytes, validation.details.fileName)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#1A1917] text-[#FAF8F5] rounded-lg hover:bg-[#32302C] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Descargar PDF verificado
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor de PDF verificado"
              className="p-2 text-[#6B665E] hover:text-[#1A1917] hover:bg-[#E6DFD3]/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3 border-b border-[#E6DFD3] flex items-center justify-between text-xs text-[#6B665E]">
          <span>
            PDF {validation.details.pdfVersion ?? '1.4'} · Integridad %%EOF verificada
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E6DFD3] bg-[#FAF8F5] text-[#1A1917] disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Anterior
            </button>
            <span className="tabular-nums text-[#1A1917]">
              Página {pageNumber} de {totalPages}
            </span>
            <button
              type="button"
              disabled={pageNumber >= totalPages}
              onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E6DFD3] bg-[#FAF8F5] text-[#1A1917] disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#EAE2D3]/60 p-4 sm:p-6 flex flex-col items-center">
          {renderError && (
            <p className="text-sm text-[#B45335] mb-3">{renderError}</p>
          )}
          {rendering && (
            <p className="text-xs text-[#6B665E] mb-3">
              Renderizando página en entorno aislado...
            </p>
          )}
          <div className="bg-white rounded-xl border border-[#E6DFD3] p-2 sm:p-4 shadow-sm max-w-full">
            <canvas
              ref={canvasRef}
              data-testid="verified-local-pdf-canvas"
              className={`max-w-full h-auto ${rendering ? 'opacity-50' : 'opacity-100'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
