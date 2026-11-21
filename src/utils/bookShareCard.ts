import { BRAND_CONFIG } from '../config/brand';
import type { BookIndexEntry } from '../types/folio';
import { sanitizePlainText } from './sanitization';

/** Formato vertical 4:5: el que más espacio ocupa en el muro de Facebook (y sirve en Instagram). */
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const PAPER = '#F3EDE2';
const INK = '#2B2A26';
const INK_SOFT = '#66625A';
const ACCENT = '#B06A4C';

const SERIF = '"Fraunces", Georgia, serif';
const SANS = '"Plus Jakarta Sans", -apple-system, "Segoe UI", sans-serif';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < words.length; i += 1) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = words[i];
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  // Si el texto no cupo entero, la última línea termina en "…".
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, last.lastIndexOf(' ') > 0 ? last.lastIndexOf(' ') : last.length - 1);
    }
    lines[lines.length - 1] = `${last.replace(/[,.;:]$/, '')}…`;
  }
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Espera a que las fuentes de la página estén listas para que el canvas no use otras. */
export async function ensureShareCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`500 64px ${SERIF}`),
    document.fonts.load(`italic 400 40px ${SERIF}`),
    document.fonts.load(`500 26px ${SANS}`),
    document.fonts.load(`600 22px ${SANS}`),
  ]).catch(() => undefined);
}

/**
 * Dibuja la tarjeta: sala con lámpara, portada del libro, su frase de apertura y la marca.
 * Colores fijos de papel (no dependen del modo noche) para que se vea igual en cualquier muro.
 */
export function drawBookShareCard(canvas: HTMLCanvasElement, book: BookIndexEntry, siteHost: string): void {
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Papel con luz cálida de lámpara desde arriba
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 820);
  glow.addColorStop(0, 'rgba(255, 220, 165, 0.55)');
  glow.addColorStop(0.5, 'rgba(255, 220, 165, 0.14)');
  glow.addColorStop(1, 'rgba(255, 220, 165, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Lámpara colgante
  ctx.strokeStyle = 'rgba(43, 42, 38, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, 70);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 46, 128);
  ctx.lineTo(W / 2 - 26, 70);
  ctx.lineTo(W / 2 + 26, 70);
  ctx.lineTo(W / 2 + 46, 128);
  ctx.closePath();
  ctx.fill();
  const bulb = ctx.createRadialGradient(W / 2, 128, 0, W / 2, 128, 40);
  bulb.addColorStop(0, 'rgba(255, 222, 168, 1)');
  bulb.addColorStop(0.35, 'rgba(255, 214, 150, 0.7)');
  bulb.addColorStop(1, 'rgba(255, 214, 150, 0)');
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.arc(W / 2, 128, 40, 0, Math.PI * 2);
  ctx.fill();

  // Encabezado: "Lo leí en LeerEsPensar"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 22px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('LO LEÍ EN', W / 2, 228);
  ctx.letterSpacing = '0px';
  drawBrand(ctx, W / 2, 290, 58);

  // Portada del libro (con lomo, sombra y canto de páginas)
  const coverW = 380;
  const coverH = 506;
  const coverX = (W - coverW) / 2;
  const coverY = 350;
  const theme = book.coverTheme;
  ctx.save();
  ctx.shadowColor = 'rgba(40, 26, 10, 0.38)';
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 26;
  roundedRect(ctx, coverX, coverY, coverW, coverH, 10);
  ctx.fillStyle = theme.paperTint;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, coverX, coverY, coverW, coverH, 10);
  ctx.clip();
  ctx.fillStyle = theme.spineColor;
  ctx.fillRect(coverX, coverY, 26, coverH);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillRect(coverX + 26, coverY, 3, coverH);
  ctx.restore();

  const innerX = coverX + 58;
  const innerW = coverW - 92;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.secondaryTextColor ?? INK_SOFT;
  ctx.font = `500 21px ${SANS}`;
  if (book.genre !== 'Sin clasificar') ctx.fillText(book.genre, innerX, coverY + 62);
  ctx.fillStyle = theme.inkColor;
  ctx.font = `500 48px ${SERIF}`;
  const titleLines = wrapLines(ctx, book.title, innerW, 4);
  titleLines.forEach((line, i) => ctx.fillText(line, innerX, coverY + 140 + i * 56));
  ctx.fillStyle = theme.accentColor;
  ctx.fillRect(innerX, coverY + coverH - 140, 54, 2);
  ctx.font = `600 24px ${SANS}`;
  wrapLines(ctx, book.authorName, innerW, 2).forEach((line, i) =>
    ctx.fillText(line, innerX, coverY + coverH - 100 + i * 30),
  );
  ctx.fillStyle = theme.secondaryTextColor ?? INK_SOFT;
  ctx.font = `500 19px ${SANS}`;
  if (book.publicationYear) ctx.fillText(String(book.publicationYear), innerX, coverY + coverH - 34);
  ctx.textAlign = 'right';
  ctx.fillText(`${book.pageCount} págs.`, coverX + coverW - 34, coverY + coverH - 34);

  // Frase de apertura del libro
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `italic 400 38px ${SERIF}`;
  const quote = sanitizePlainText(book.firstSip, 400);
  const quoteText = quote ? `«${quote}»` : `Un libro de ${book.authorName} que vale la pena leer.`;
  const quoteLines = wrapLines(ctx, quoteText, W - 220, 3);
  const quoteTop = coverY + coverH + 112;
  quoteLines.forEach((line, i) => ctx.fillText(line, W / 2, quoteTop + i * 52));
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 23px ${SANS}`;
  ctx.fillText(`${book.title} · ${book.authorName}`, W / 2, quoteTop + quoteLines.length * 52 + 22);

  // Pie: invitación y dirección
  ctx.strokeStyle = 'rgba(43, 42, 38, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, H - 128);
  ctx.lineTo(W - 140, H - 128);
  ctx.stroke();
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 23px ${SANS}`;
  ctx.fillText('Clásicos literarios para descargar en PDF, gratis.', W / 2, H - 78);
  ctx.fillStyle = ACCENT;
  ctx.font = `600 23px ${SANS}`;
  ctx.fillText(siteHost, W / 2, H - 42);
}

/** "Leer" + "Es" en cursiva terracota + "Pensar", centrado. */
function drawBrand(ctx: CanvasRenderingContext2D, centerX: number, baseline: number, size: number) {
  const parts: Array<[string, string, string]> = [
    ['Leer', `500 ${size}px ${SERIF}`, INK],
    ['Es', `italic 400 ${size}px ${SERIF}`, ACCENT],
    ['Pensar', `500 ${size}px ${SERIF}`, INK],
  ];
  const widths = parts.map(([text, font]) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  });
  let x = centerX - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  parts.forEach(([text, font, color], i) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, baseline);
    x += widths[i];
  });
  ctx.textAlign = 'center';
}

/** Texto para pegar en la publicación (Facebook no deja pre-llenarlo al compartir). */
export function buildShareCaption(book: BookIndexEntry, siteUrl: string): string {
  const quote = sanitizePlainText(book.firstSip, 220);
  const quoteLines = quote ? [`«${quote}»`, ''] : [];
  // "Realismo mágico" → "RealismoMágico" (Facebook acepta tildes en los hashtags).
  const genreTag = book.genre
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return [
    `📖 Acabo de leer «${book.title}», de ${book.authorName}.`,
    '',
    ...quoteLines,
    `Lo encontré en ${BRAND_CONFIG.name}: clásicos literarios para descargar en PDF, gratis.`,
    siteUrl,
    '',
    [`#${BRAND_CONFIG.name}`, '#Lectura', book.genre === 'Sin clasificar' ? '' : `#${genreTag}`].filter(Boolean).join(' '),
  ].join('\n');
}

export function shareCardFileName(book: BookIndexEntry): string {
  return `${book.slug}-${BRAND_CONFIG.name}.png`;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}
