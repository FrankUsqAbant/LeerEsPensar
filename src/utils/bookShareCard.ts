import { BRAND_CONFIG } from '../config/brand';
import type { BookIndexEntry } from '../types/folio';
import { readingQuoteFor } from './fanPage';
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
export interface ShareCardOptions {
  /** "María G.": la tarjeta dice "MARÍA G. LO LEYÓ EN" en vez de "LO LEÍ EN". */
  lector?: string;
  /** Resumen corto: reemplaza la frase de apertura. */
  texto?: string;
  /** Lo que el lector dijo del libro: va en grande bajo su nombre. */
  comentario?: string;
  /** Portada real ya cargada: se dibuja sobre la tapa en lugar del diseño generado. */
  portada?: CanvasImageSource | null;
}

/** Carga una imagen (misma web) para dibujarla en la tarjeta; null si no se puede. */
export function loadShareImage(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export function drawBookShareCard(
  canvas: HTMLCanvasElement,
  book: BookIndexEntry,
  siteHost: string,
  options: ShareCardOptions = {},
): void {
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

  // Tarjeta del lector: su nombre y su comentario (o una cita) son lo principal.
  if (options.lector) {
    drawReaderCard(ctx, book, siteHost, options);
    return;
  }

  // Encabezado: "Lo leí en LeerEsPensar"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 22px ${SANS}`;
  ctx.letterSpacing = '6px';
  ctx.fillText('LO LEÍ EN', W / 2, 228);
  ctx.letterSpacing = '0px';
  drawBrand(ctx, W / 2, 290, 58);

  const coverW = 380;
  const coverH = 506;
  const coverX = (W - coverW) / 2;
  const coverY = 350;
  drawCover(ctx, book, coverX, coverY, coverW, coverH, options.portada);

  // Frase de apertura del libro
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  const resumen = options.texto ? sanitizePlainText(options.texto, 420) : '';
  ctx.font = resumen ? `italic 400 33px ${SERIF}` : `italic 400 38px ${SERIF}`;
  const quote = sanitizePlainText(book.firstSip, 400);
  const quoteText = resumen || (quote ? `«${quote}»` : `Un libro de ${book.authorName} que vale la pena leer.`);
  const quoteLines = wrapLines(ctx, quoteText, W - 200, resumen ? 4 : 3);
  const quoteTop = coverY + coverH + 112;
  const interlinea = resumen ? 46 : 52;
  quoteLines.forEach((line, i) => ctx.fillText(line, W / 2, quoteTop + i * interlinea));
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 23px ${SANS}`;
  ctx.fillText(`${book.title} · ${book.authorName}`, W / 2, quoteTop + quoteLines.length * interlinea + 22);

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

/** Portada del libro con lomo, sombra y, si hay, la portada real. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  book: BookIndexEntry,
  coverX: number,
  coverY: number,
  coverW: number,
  coverH: number,
  portada: CanvasImageSource | null | undefined,
) {
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

  if (portada) {
    // Portada real a la derecha del lomo, recortada para llenar la tapa sin deformarse.
    const img = portada as HTMLImageElement;
    const areaX = coverX + 29;
    const areaW = coverW - 29;
    const escala = Math.max(areaW / img.width, coverH / img.height);
    const sw = areaW / escala;
    const sh = coverH / escala;
    ctx.save();
    roundedRect(ctx, coverX, coverY, coverW, coverH, 10);
    ctx.clip();
    ctx.drawImage(img, (img.width - sw) / 2, 0, sw, sh, areaX, coverY, areaW, coverH);
    const brillo = ctx.createLinearGradient(areaX, 0, areaX + 40, 0);
    brillo.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    brillo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(areaX, coverY, 40, coverH);
    ctx.restore();
  }

  const innerX = coverX + 58;
  const innerW = coverW - 92;
  ctx.textAlign = 'left';
  if (!portada) {
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
  }
}

/**
 * Tarjeta "{lector} lo leyó": portada arriba, el nombre del lector grande en el centro
 * y debajo su comentario (o una cita clásica). Lo importante queda dentro del cuadrado
 * central (y 135–1215) para que Facebook no lo recorte en ninguna vista.
 */
function drawReaderCard(
  ctx: CanvasRenderingContext2D,
  book: BookIndexEntry,
  siteHost: string,
  options: ShareCardOptions,
) {
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;
  const lector = sanitizePlainText(options.lector ?? '', 40);

  const coverW = 384;
  const coverH = 512;
  const coverY = 160;
  drawCover(ctx, book, (W - coverW) / 2, coverY, coverW, coverH, options.portada);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 24px ${SANS}`;
  const ficha = book.authorName && book.authorName !== 'Autor desconocido' ? `${book.title} · ${book.authorName}` : book.title;
  ctx.fillText(wrapLines(ctx, ficha, W - 220, 1)[0] ?? '', W / 2, coverY + coverH + 62);

  // "Frank A. lo leyó"
  const nombreFont = `500 68px ${SERIF}`;
  const lFont = `italic 400 48px ${SERIF}`;
  ctx.font = nombreFont;
  const wNombre = ctx.measureText(lector).width;
  ctx.font = lFont;
  const wLeyo = ctx.measureText(' lo leyó').width;
  let x = W / 2 - (wNombre + wLeyo) / 2;
  const yNombre = coverY + coverH + 160;
  ctx.textAlign = 'left';
  ctx.font = nombreFont;
  ctx.fillStyle = INK;
  ctx.fillText(lector, x, yNombre);
  x += wNombre;
  ctx.font = lFont;
  ctx.fillStyle = ACCENT;
  ctx.fillText(' lo leyó', x, yNombre);
  ctx.textAlign = 'center';

  // Su comentario; si no escribió nada, una cita clásica sobre la lectura.
  const comentario = sanitizePlainText(options.comentario ?? '', 240) || sanitizePlainText(options.texto ?? '', 240);
  const [cita, autorCita] = readingQuoteFor(`${book.title}|${lector}`);
  const frase = comentario || cita;
  const firma = comentario ? "" : `— ${autorCita}`;
  ctx.fillStyle = 'rgba(43, 42, 38, 0.18)';
  ctx.fillRect(W / 2 - 28, yNombre + 42, 56, 2);
  ctx.fillStyle = INK;
  ctx.font = `italic 400 36px ${SERIF}`;
  const lineas = wrapLines(ctx, `«${frase}»`, W - 240, 3);
  const top = yNombre + 112;
  lineas.forEach((linea, i) => ctx.fillText(linea, W / 2, top + i * 50));
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 23px ${SANS}`;
  if (firma) ctx.fillText(firma, W / 2, top + lineas.length * 50 + 16);

  // Marca dentro de la zona segura y dirección al pie.
  drawBrand(ctx, W / 2, 1180, 46);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText('Clásicos para descargar en PDF, gratis', W / 2, H - 92);
  ctx.fillStyle = ACCENT;
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText(siteHost, W / 2, H - 56);
}
