import { BRAND_CONFIG } from '../config/brand';
import type { BookIndexEntry } from '../types/folio';
import { sanitizePlainText } from './sanitization';

export interface AchievementCardOptions {
  book: BookIndexEntry;
  readerName?: string;
  quote?: string;
  completedAtIso?: string;
}

function wrapCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}

export function drawAchievementCardToCanvas(
  canvas: HTMLCanvasElement,
  options: AchievementCardOptions,
): void {
  const width = 1200;
  const height = 630;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { book } = options;
  const safeReader = sanitizePlainText(options.readerName || 'Lector', 60);
  const safeQuote = sanitizePlainText(
    options.quote || book.hookSummary,
    240,
  );
  const dateLabel = options.completedAtIso
    ? new Date(options.completedAtIso).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  // Fondo papel archivo cálido con gradiente suave
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#FAF8F5');
  bg.addColorStop(0.65, '#F3EFE8');
  bg.addColorStop(1, '#EAE2D4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Marco editorial fino
  ctx.strokeStyle = '#DFD5C5';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Ornamento botánico sutil en esquina superior derecha
  ctx.save();
  ctx.translate(1030, 88);
  ctx.strokeStyle = '#4A5D4E';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(110, -30);
  ctx.bezierCurveTo(60, 20, 40, 85, -10, 125);
  ctx.stroke();

  const leaves: Array<[number, number, number]> = [
    [68, 12, -0.4],
    [42, 48, 0.35],
    [22, 82, -0.5],
    [-4, 110, 0.25],
  ];
  for (const [lx, ly, rot] of leaves) {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(74, 93, 78, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Cubierta física del libro a la izquierda
  const coverX = 82;
  const coverY = 92;
  const coverW = 286;
  const coverH = 420;

  ctx.save();
  ctx.shadowColor = 'rgba(26, 25, 23, 0.16)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = book.coverTheme.paperTint;
  ctx.fillRect(coverX, coverY, coverW, coverH);
  ctx.restore();

  ctx.fillStyle = book.coverTheme.spineColor;
  ctx.fillRect(coverX, coverY, 18, coverH);

  ctx.strokeStyle = 'rgba(26, 25, 23, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(coverX, coverY, coverW, coverH);

  ctx.fillStyle = '#6B665E';
  ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(book.genre, coverX + 38, coverY + 52);

  ctx.fillStyle = book.coverTheme.inkColor;
  ctx.font = '600 34px "Fraunces", Georgia, serif';
  const coverTitleLines = wrapCanvasLines(ctx, book.title, coverW - 60, 4);
  coverTitleLines.forEach((line, idx) => {
    ctx.fillText(line, coverX + 38, coverY + 132 + idx * 42);
  });

  ctx.fillStyle = book.coverTheme.accentColor;
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(book.authorName, coverX + 38, coverY + 332);

  ctx.fillStyle = '#6B665E';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${book.publicationYear} · ${book.pageCount} págs.`, coverX + 38, coverY + 378);

  // Columna editorial derecha
  const rightX = 426;
  const maxTextW = 685;

  ctx.fillStyle = '#4A5D4E';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Leído en ${BRAND_CONFIG.name}`, rightX, 118);

  ctx.fillStyle = '#1A1917';
  ctx.font = '600 46px "Fraunces", Georgia, serif';
  const heroTitleLines = wrapCanvasLines(ctx, book.title, maxTextW, 2);
  heroTitleLines.forEach((line, idx) => {
    ctx.fillText(line, rightX, 178 + idx * 54);
  });

  const afterTitleY = 178 + heroTitleLines.length * 54;
  ctx.fillStyle = '#B45335';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(book.authorName, rightX, afterTitleY + 4);

  // Línea separadora terracota
  ctx.fillStyle = '#D97757';
  ctx.fillRect(rightX, afterTitleY + 28, 72, 3);

  // Cita / reflexión del lector
  ctx.fillStyle = '#1A1917';
  ctx.font = 'italic 24px "Fraunces", Georgia, serif';
  const quoteLines = wrapCanvasLines(ctx, `«${safeQuote}»`, maxTextW, 4);
  quoteLines.forEach((line, idx) => {
    ctx.fillText(line, rightX, afterTitleY + 76 + idx * 34);
  });

  // Pie de atribución
  ctx.strokeStyle = '#DFD5C5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightX, 505);
  ctx.lineTo(1110, 505);
  ctx.stroke();

  ctx.fillStyle = '#1A1917';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Bitácora de ${safeReader}`, rightX, 544);

  ctx.fillStyle = '#6B665E';
  ctx.font = '400 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${dateLabel} · Biblioteca editorial gratuita`, rightX, 572);
}

export function downloadAchievementCardPng(
  canvas: HTMLCanvasElement,
  bookSlug: string,
): void {
  const dataUrl = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `${bookSlug}-logro-${BRAND_CONFIG.name}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
