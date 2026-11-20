import { BRAND_CONFIG } from '../config/brand';
import { getBookEditionContent, type BookEditionContent } from '../data/bookEditions';
import type { BookIndexEntry, PdfValidationResult } from '../types/folio';
import { validatePdfFile } from './pdfSecurityValidator';

const WINANSI_MAP: Record<number, number> = {
  0x20ac: 0x80, // €
  0x201a: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201e: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02c6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8a, // Š
  0x2039: 0x8b, // ‹
  0x0152: 0x8c, // Œ
  0x017d: 0x8e, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9a, // š
  0x203a: 0x9b, // ›
  0x0153: 0x9c, // œ
  0x017e: 0x9e, // ž
  0x0178: 0x9f, // Ÿ
};

/**
 * Convierte texto Unicode (español con tildes, eñes, comillas y rayas) a bytes WinAnsi
 * compatibles con fuentes estándar PDF Type1 (/WinAnsiEncoding).
 */
export function encodeWinAnsiStringLiteral(text: string): Uint8Array {
  const bytes: number[] = [0x28]; // '('
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x20;
    let byteVal = 0x3f; // '?'
    if (code >= 0x20 && code <= 0x7e) {
      byteVal = code;
    } else if (code >= 0xa0 && code <= 0xff) {
      byteVal = code;
    } else if (code in WINANSI_MAP) {
      byteVal = WINANSI_MAP[code];
    }

    if (byteVal === 0x28 || byteVal === 0x29 || byteVal === 0x5c) {
      bytes.push(0x5c, byteVal);
    } else {
      bytes.push(byteVal);
    }
  }
  bytes.push(0x29); // ')'
  return new Uint8Array(bytes);
}

export function wrapTextToLines(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

interface PdfLineSpec {
  text: string;
  font: 'F1' | 'F2' | 'F3';
  size: number;
  leading: number;
  colorRgb: [number, number, number];
}

function buildEditorialLinePlan(
  book: BookIndexEntry,
  edition: BookEditionContent,
): PdfLineSpec[][] {
  const pages: PdfLineSpec[][] = [];

  // Página 1: Portada editorial, El Gancho y Lo que te vas a llevar
  const coverPage: PdfLineSpec[] = [
    {
      text: `${BRAND_CONFIG.name} · Colección Editorial Libre`,
      font: 'F1',
      size: 10,
      leading: 20,
      colorRgb: [0.29, 0.36, 0.31], // #4A5D4E
    },
    {
      text: `${book.genre} · ${book.publicationYear} · ${book.readingTimeMinutes} min`,
      font: 'F1',
      size: 10,
      leading: 26,
      colorRgb: [0.42, 0.4, 0.37],
    },
  ];

  for (const titleLine of wrapTextToLines(book.title, 34)) {
    coverPage.push({
      text: titleLine,
      font: 'F2',
      size: 24,
      leading: 29,
      colorRgb: [0.1, 0.1, 0.09],
    });
  }

  if (book.subtitle) {
    for (const subLine of wrapTextToLines(book.subtitle, 56)) {
      coverPage.push({
        text: subLine,
        font: 'F3',
        size: 13,
        leading: 19,
        colorRgb: [0.42, 0.4, 0.37],
      });
    }
  }

  coverPage.push({
    text: book.authorName,
    font: 'F2',
    size: 14,
    leading: 32,
    colorRgb: [0.71, 0.33, 0.21], // #B45335
  });

  coverPage.push({
    text: 'El Gancho',
    font: 'F2',
    size: 13,
    leading: 20,
    colorRgb: [0.29, 0.36, 0.31],
  });
  for (const line of wrapTextToLines(book.hookSummary, 72)) {
    coverPage.push({
      text: line,
      font: 'F1',
      size: 11,
      leading: 17,
      colorRgb: [0.12, 0.12, 0.11],
    });
  }

  coverPage.push({
    text: 'Lo que te vas a llevar',
    font: 'F2',
    size: 13,
    leading: 26,
    colorRgb: [0.29, 0.36, 0.31],
  });

  book.takeaways.forEach((item, idx) => {
    const wrapped = wrapTextToLines(`${idx + 1}. ${item}`, 70);
    wrapped.forEach((line, lIdx) => {
      coverPage.push({
        text: line,
        font: 'F1',
        size: 10.5,
        leading: lIdx === wrapped.length - 1 ? 20 : 15,
        colorRgb: [0.15, 0.14, 0.13],
      });
    });
  });

  coverPage.push({
    text: edition.editionNote,
    font: 'F3',
    size: 9.5,
    leading: 22,
    colorRgb: [0.42, 0.4, 0.37],
  });

  pages.push(coverPage);

  // Páginas siguientes: Capítulos y pasajes de lectura completa paginados
  const contentStreamLines: PdfLineSpec[] = [];
  for (const section of edition.sections) {
    for (const headingLine of wrapTextToLines(section.title, 48)) {
      contentStreamLines.push({
        text: headingLine,
        font: 'F2',
        size: 15,
        leading: 24,
        colorRgb: [0.1, 0.1, 0.09],
      });
    }
    for (const para of section.paragraphs) {
      const wrapped = wrapTextToLines(para, 72);
      wrapped.forEach((line, idx) => {
        contentStreamLines.push({
          text: line,
          font: 'F1',
          size: 11.2,
          leading: idx === wrapped.length - 1 ? 23 : 17,
          colorRgb: [0.12, 0.12, 0.11],
        });
      });
    }
  }

  contentStreamLines.push({
    text: `Nota final · ${edition.closingReflection}`,
    font: 'F3',
    size: 11,
    leading: 24,
    colorRgb: [0.29, 0.36, 0.31],
  });

  const maxYBudget = 635;
  let currentPage: PdfLineSpec[] = [];
  let usedHeight = 0;

  for (const line of contentStreamLines) {
    if (usedHeight + line.leading > maxYBudget && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = 0;
    }
    currentPage.push(line);
    usedHeight += line.leading;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

const ascii = (str: string): Uint8Array => new TextEncoder().encode(str);

function buildPageContentStream(
  lines: PdfLineSpec[],
  bookTitle: string,
  pageNumber: number,
  totalPages: number,
): Uint8Array {
  const chunks: Uint8Array[] = [];

  // Fondo sutil tono papel archivo (#FAF8F5 -> 0.98 0.97 0.96)
  chunks.push(ascii('q 0.980 0.973 0.961 rg 0 0 612 792 re f Q\n'));
  // Filete superior editorial
  chunks.push(ascii('q 0.851 0.467 0.341 RG 1.2 w 64 742 m 548 742 l S Q\n'));

  // Encabezado sutil de página
  chunks.push(ascii('BT /F1 9 Tf 0.420 0.400 0.369 rg 64 752 Td '));
  chunks.push(encodeWinAnsiStringLiteral(`${bookTitle} — ${BRAND_CONFIG.name}`));
  chunks.push(ascii(' Tj ET\n'));

  let y = 708;
  for (const line of lines) {
    chunks.push(
      ascii(
        `BT /${line.font} ${line.size} Tf ${line.colorRgb[0].toFixed(3)} ${line.colorRgb[1].toFixed(3)} ${line.colorRgb[2].toFixed(3)} rg 64 ${y.toFixed(1)} Td `,
      ),
    );
    chunks.push(encodeWinAnsiStringLiteral(line.text));
    chunks.push(ascii(' Tj ET\n'));
    y -= line.leading;
  }

  // Pie de página con número de página y nota de edición libre
  chunks.push(ascii('q 0.902 0.875 0.827 RG 0.8 w 64 58 m 548 58 l S Q\n'));
  chunks.push(ascii('BT /F1 9 Tf 0.420 0.400 0.369 rg 64 42 Td '));
  chunks.push(
    encodeWinAnsiStringLiteral(
      `Edición libre verificada · Página ${pageNumber} de ${totalPages}`,
    ),
  );
  chunks.push(ascii(' Tj ET\n'));

  return concatBytes(chunks);
}

/**
 * Construye un archivo PDF 1.4 multipágina válido, determinista y seguro (sin JavaScript),
 * con tabla xref exacta y cierre %%EOF.
 */
export function buildBookEditionPdfBytes(book: BookIndexEntry): Uint8Array {
  const edition = getBookEditionContent(book);
  const pagePlans = buildEditorialLinePlan(book, edition);
  const totalPages = pagePlans.length;

  // Estructura de objetos PDF:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica - sans)
  // 4: Font F2 (Times-Bold - serif título)
  // 5: Font F3 (Times-Italic - serif cita/nota)
  // 6..: pares (Page obj, Content stream obj)
  const objects: Uint8Array[] = [];

  const pageIds: number[] = [];
  for (let i = 0; i < totalPages; i += 1) {
    pageIds.push(6 + i * 2);
  }

  objects.push(ascii('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'));
  objects.push(
    ascii(
      `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj\n`,
    ),
  );
  objects.push(
    ascii(
      '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    ),
  );
  objects.push(
    ascii(
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    ),
  );
  objects.push(
    ascii(
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>\nendobj\n',
    ),
  );

  for (let i = 0; i < totalPages; i += 1) {
    const pageObjId = 6 + i * 2;
    const contentObjId = pageObjId + 1;
    const streamBytes = buildPageContentStream(pagePlans[i], book.title, i + 1, totalPages);

    objects.push(
      ascii(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>\nendobj\n`,
      ),
    );

    objects.push(
      concatBytes([
        ascii(`${contentObjId} 0 obj\n<< /Length ${streamBytes.byteLength} >>\nstream\n`),
        streamBytes,
        ascii('\nendstream\nendobj\n'),
      ]),
    );
  }

  const parts: Uint8Array[] = [ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  let currentOffset = parts[0].byteLength;
  const offsets: number[] = [0];

  for (const objBytes of objects) {
    offsets.push(currentOffset);
    parts.push(objBytes);
    currentOffset += objBytes.byteLength;
  }

  const xrefStart = currentOffset;
  const xrefLines: string[] = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
  ];
  for (let i = 1; i <= objects.length; i += 1) {
    xrefLines.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  xrefLines.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
  );

  parts.push(ascii(xrefLines.join('')));
  return concatBytes(parts);
}

export interface PreparedBookPdf {
  fileName: string;
  bytes: Uint8Array;
  validation: PdfValidationResult;
  source: 'remote' | 'generated-edition';
}

/**
 * Intenta obtener un PDF estático si existe en el servidor; si no, construye la edición
 * editorial PDF multipágina y la somete siempre al validador de seguridad e integridad.
 */
export async function prepareVerifiedBookPdf(
  book: BookIndexEntry,
  options: { skipPdfJsParsing?: boolean } = {},
): Promise<PreparedBookPdf> {
  const fileName = `${book.slug}-${BRAND_CONFIG.name}.pdf`;

  if (typeof fetch === 'function' && book.pdfUrl.startsWith('/')) {
    try {
      const response = await fetch(book.pdfUrl, { method: 'GET' });
      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.toLowerCase().includes('pdf')) {
        const buffer = new Uint8Array(await response.arrayBuffer());
        const validation = await validatePdfFile(buffer, {
          fileName,
          mimeType: 'application/pdf',
          skipPdfJsParsing: options.skipPdfJsParsing,
        });
        if (validation.valid) {
          return { fileName, bytes: buffer, validation, source: 'remote' };
        }
      }
    } catch {
      // Silenciosamente pasamos a construir la edición editorial verificada localmente.
    }
  }

  const bytes = buildBookEditionPdfBytes(book);
  const validation = await validatePdfFile(bytes, {
    fileName,
    mimeType: 'application/pdf',
    skipPdfJsParsing: options.skipPdfJsParsing,
  });

  return {
    fileName,
    bytes,
    validation,
    source: 'generated-edition',
  };
}

export function triggerPdfBytesDownload(bytes: Uint8Array, fileName: string): void {
  const safeBytes = bytes.slice();
  const blob = new Blob([safeBytes], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
