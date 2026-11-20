import { getAllAuthors, getCatalogBooks } from '../data/catalogEngine';

export interface PreloadStage {
  progress: number;
  label: string;
  done: boolean;
}

function createProceduralPaperDataUrl(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, 96, 96);

    // Sutil fibra orgánica de papel editorial
    for (let i = 0; i < 180; i += 1) {
      const x = (i * 37) % 96;
      const y = (i * 53) % 96;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(26,25,23,0.025)' : 'rgba(199,166,123,0.04)';
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function waitForFontsWithTimeout(timeoutMs = 800): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  await Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/**
 * Ejecuta la precarga real de índice del catálogo, texturas de papel en memoria
 * y fuentes editoriales, reportando progreso continuo hasta 100%.
 */
export async function preloadEditorialAssets(
  onProgress: (stage: PreloadStage) => void,
  signal?: AbortSignal,
): Promise<{ paperTextureUrl: string | null }> {
  const report = (progress: number, label: string, done = false) => {
    if (!signal?.aborted) {
      onProgress({ progress, label, done });
    }
  };

  report(12, 'Preparando tipografías editoriales...');
  await waitForFontsWithTimeout(700);
  if (signal?.aborted) return { paperTextureUrl: null };

  report(44, 'Indexando catálogo y autores...');
  const books = getCatalogBooks();
  const authors = getAllAuthors();
  // Precalentar búsqueda inicial sin cargar ningún PDF
  void (books.length + authors.length);
  if (signal?.aborted) return { paperTextureUrl: null };

  report(76, 'Tejiendo texturas de papel archivo...');
  const paperTextureUrl = createProceduralPaperDataUrl();
  if (signal?.aborted) return { paperTextureUrl };

  report(100, 'Biblioteca lista para leer', true);
  return { paperTextureUrl };
}
