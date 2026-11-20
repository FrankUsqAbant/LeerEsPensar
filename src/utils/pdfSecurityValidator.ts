import type { PdfValidationDetails, PdfValidationResult } from '../types/folio';

export const DEFAULT_MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
const PDF_MAGIC_PREFIX = '%PDF-';
const PDF_VERSION_REGEX = /^%PDF-([12]\.\d)/;

export interface PdfValidationOptions {
  maxSizeBytes?: number;
  fileName?: string;
  mimeType?: string;
  /** Permite omitir la inspección por worker de PDF.js (útil en pruebas unitarias sin worker) */
  skipPdfJsParsing?: boolean;
}

export interface ByteInspectionResult {
  valid: boolean;
  errorCode?: PdfValidationResult['errorCode'];
  userMessage: string;
  technicalReason?: string;
  pdfVersion: string | null;
  hasEndOfFileMarker: boolean;
  containsActiveScripts: boolean;
}

function decodeAsciiSlice(bytes: Uint8Array, start: number, end: number): string {
  const slice = bytes.subarray(Math.max(0, start), Math.min(bytes.length, end));
  let out = '';
  for (let i = 0; i < slice.length; i += 1) {
    out += String.fromCharCode(slice[i]);
  }
  return out;
}

export async function computeSha256Hex(bytes: Uint8Array): Promise<string | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) return null;
    const bufferCopy = bytes.slice().buffer;
    const hashBuffer = await subtle.digest('SHA-256', bufferCopy);
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

/**
 * Inspección síncrona y pura de Magic Bytes (%PDF-), versión, marcador %%EOF,
 * límite de tamaño, tipo MIME y patrones de script activo.
 */
export function inspectPdfBytes(
  bytes: Uint8Array,
  fileName = 'documento.pdf',
  mimeType = 'application/pdf',
  maxSizeBytes = DEFAULT_MAX_PDF_BYTES,
): ByteInspectionResult {
  if (bytes.byteLength === 0) {
    return {
      valid: false,
      errorCode: 'EMPTY_FILE',
      userMessage: 'El archivo está vacío (0 bytes). Verifica que la descarga no haya fallado.',
      technicalReason: 'Empty byte buffer (length === 0).',
      pdfVersion: null,
      hasEndOfFileMarker: false,
      containsActiveScripts: false,
    };
  }

  if (bytes.byteLength > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      valid: false,
      errorCode: 'FILE_TOO_LARGE',
      userMessage: `El archivo supera el límite permitido de ${maxMb} MB para lectura segura en navegador.`,
      technicalReason: `File size ${bytes.byteLength} exceeds maxSizeBytes ${maxSizeBytes}.`,
      pdfVersion: null,
      hasEndOfFileMarker: false,
      containsActiveScripts: false,
    };
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  const hasPdfExtension = fileName.toLowerCase().endsWith('.pdf');
  const isAcceptedMime =
    normalizedMime === '' ||
    normalizedMime === 'application/pdf' ||
    normalizedMime === 'application/x-pdf' ||
    normalizedMime === 'application/octet-stream';

  if (!isAcceptedMime || (normalizedMime === 'application/octet-stream' && !hasPdfExtension)) {
    return {
      valid: false,
      errorCode: 'INVALID_MIME_TYPE',
      userMessage: 'El tipo de archivo no corresponde a un documento PDF válido.',
      technicalReason: `Rejected MIME "${mimeType}" for file "${fileName}".`,
      pdfVersion: null,
      hasEndOfFileMarker: false,
      containsActiveScripts: false,
    };
  }

  // Según la especificación PDF, %PDF- debe aparecer dentro de los primeros 1024 bytes.
  const headText = decodeAsciiSlice(bytes, 0, Math.min(bytes.length, 1024));
  const magicIndex = headText.indexOf(PDF_MAGIC_PREFIX);

  if (magicIndex === -1) {
    return {
      valid: false,
      errorCode: 'INVALID_MAGIC_BYTES',
      userMessage:
        'Este archivo no es un PDF real o su cabecera está dañada (falta la firma %PDF-).',
      technicalReason: 'Missing %PDF- magic bytes in first 1024 bytes.',
      pdfVersion: null,
      hasEndOfFileMarker: false,
      containsActiveScripts: false,
    };
  }

  const versionMatch = headText.slice(magicIndex, magicIndex + 16).match(PDF_VERSION_REGEX);
  const pdfVersion = versionMatch ? versionMatch[1] : null;
  if (!pdfVersion) {
    return {
      valid: false,
      errorCode: 'INVALID_MAGIC_BYTES',
      userMessage:
        'La cabecera del PDF está corrupta o declara una versión incompatible.',
      technicalReason: 'Invalid or unsupported %PDF-x.y version header.',
      pdfVersion: null,
      hasEndOfFileMarker: false,
      containsActiveScripts: false,
    };
  }

  // Verificar marcador de cierre %%EOF en los últimos 2048 bytes para detectar truncamiento.
  const tailStart = Math.max(0, bytes.length - 2048);
  const tailText = decodeAsciiSlice(bytes, tailStart, bytes.length);
  const hasEndOfFileMarker = tailText.includes('%%EOF');

  // Escaneo heurístico de acciones JS o Launch embebidas (el visor siempre ejecuta con isEvalSupported: false).
  const fullScanLimit = Math.min(bytes.length, 2 * 1024 * 1024);
  const scanText = decodeAsciiSlice(bytes, 0, fullScanLimit);
  const containsActiveScripts =
    /\/JavaScript\b|\/JS\b|\/Launch\b/i.test(scanText);

  if (!hasEndOfFileMarker) {
    return {
      valid: false,
      errorCode: 'TRUNCATED_FILE',
      userMessage:
        'El PDF parece estar incompleto o truncado (falta el cierre estructural %%EOF). Puedes reportarlo para revisión.',
      technicalReason: 'Missing %%EOF trailer marker in final 2048 bytes.',
      pdfVersion,
      hasEndOfFileMarker: false,
      containsActiveScripts,
    };
  }

  return {
    valid: true,
    userMessage: 'Cabecera y estructura preliminar verificadas.',
    pdfVersion,
    hasEndOfFileMarker,
    containsActiveScripts,
  };
}

let workerConfigured = false;

async function getConfiguredPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!workerConfigured && typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}

async function readSourceToBytes(
  source: File | Blob | ArrayBuffer | Uint8Array,
): Promise<{ bytes: Uint8Array; fileName: string; mimeType: string }> {
  if (source instanceof Uint8Array) {
    return { bytes: source, fileName: 'documento.pdf', mimeType: 'application/pdf' };
  }
  if (source instanceof ArrayBuffer) {
    return {
      bytes: new Uint8Array(source),
      fileName: 'documento.pdf',
      mimeType: 'application/pdf',
    };
  }
  const buffer = await source.arrayBuffer();
  const isFile = typeof File !== 'undefined' && source instanceof File;
  return {
    bytes: new Uint8Array(buffer),
    fileName: isFile ? source.name : 'documento.pdf',
    mimeType: source.type || 'application/pdf',
  };
}

/**
 * Validador completo de seguridad e integridad de PDFs.
 * Verifica Magic Bytes (%PDF-), límites de tamaño, truncamiento, conteo real de páginas > 0
 * y parseo aislado mediante PDF.js con ejecución de JavaScript deshabilitada.
 */
export async function validatePdfFile(
  source: File | Blob | ArrayBuffer | Uint8Array,
  options: PdfValidationOptions = {},
): Promise<PdfValidationResult> {
  let bytes: Uint8Array;
  let inferredName = 'documento.pdf';
  let inferredMime = 'application/pdf';

  try {
    const resolved = await readSourceToBytes(source);
    bytes = resolved.bytes;
    inferredName = options.fileName ?? resolved.fileName;
    inferredMime = options.mimeType ?? resolved.mimeType;
  } catch (error) {
    return {
      valid: false,
      errorCode: 'READ_ERROR',
      userMessage:
        'No pudimos leer el archivo seleccionado. Verifica los permisos e inténtalo nuevamente.',
      technicalReason: error instanceof Error ? error.message : String(error),
      canReport: false,
      details: {
        fileName: options.fileName ?? 'documento.pdf',
        fileSizeBytes: 0,
        mimeType: options.mimeType ?? '',
        pdfVersion: null,
        pageCount: null,
        hasEndOfFileMarker: false,
        containsActiveScripts: false,
        sha256: null,
      },
    };
  }

  const maxBytes = options.maxSizeBytes ?? DEFAULT_MAX_PDF_BYTES;
  const byteCheck = inspectPdfBytes(bytes, inferredName, inferredMime, maxBytes);
  const sha256 = await computeSha256Hex(bytes);

  const baseDetails: PdfValidationDetails = {
    fileName: inferredName,
    fileSizeBytes: bytes.byteLength,
    mimeType: inferredMime,
    pdfVersion: byteCheck.pdfVersion,
    pageCount: null,
    hasEndOfFileMarker: byteCheck.hasEndOfFileMarker,
    containsActiveScripts: byteCheck.containsActiveScripts,
    sha256,
  };

  if (!byteCheck.valid) {
    return {
      valid: false,
      errorCode: byteCheck.errorCode,
      userMessage: byteCheck.userMessage,
      technicalReason: byteCheck.technicalReason,
      canReport:
        byteCheck.errorCode === 'TRUNCATED_FILE' ||
        byteCheck.errorCode === 'INVALID_MAGIC_BYTES',
      details: baseDetails,
    };
  }

  if (options.skipPdfJsParsing) {
    return {
      valid: true,
      userMessage: 'Documento PDF válido y listo para lectura segura.',
      canReport: false,
      details: baseDetails,
    };
  }

  let activeTask: { destroy: () => Promise<void> } | null = null;

  try {
    const pdfjsLib = await getConfiguredPdfJs();
    // Pasamos una copia para evitar que el Worker transfiera y libere el buffer original.
    const loadingTask = pdfjsLib.getDocument({
      data: bytes.slice(),
      disableAutoFetch: true,
      enableXfa: false,
      stopAtErrors: true,
      verbosity: 0,
    });
    activeTask = loadingTask;

    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    await pdfDocument.cleanup();
    await loadingTask.destroy();

    if (!Number.isFinite(pageCount) || pageCount <= 0) {
      return {
        valid: false,
        errorCode: 'ZERO_PAGES',
        userMessage:
          'El archivo PDF no contiene páginas legibles (0 páginas). Puede estar vacío o dañado.',
        technicalReason: `PDF.js reported numPages=${pageCount}.`,
        canReport: true,
        details: { ...baseDetails, pageCount: 0 },
      };
    }

    return {
      valid: true,
      userMessage: `PDF íntegro verificado (${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}, PDF ${byteCheck.pdfVersion}).`,
      canReport: false,
      details: { ...baseDetails, pageCount },
    };
  } catch (error) {
    const errName = error instanceof Error ? error.name : '';
    const errMsg = error instanceof Error ? error.message : String(error);

    if (activeTask) {
      await activeTask.destroy().catch(() => undefined);
    }

    if (errName === 'PasswordException' || /password/i.test(errMsg)) {
      return {
        valid: false,
        errorCode: 'ENCRYPTED_PDF',
        userMessage:
          'Este PDF está protegido con contraseña. LeerEsPensar requiere ejemplares libres de cifrado para la lectura abierta.',
        technicalReason: errMsg,
        canReport: false,
        details: baseDetails,
      };
    }

    return {
      valid: false,
      errorCode: 'CORRUPTED_STRUCTURE',
      userMessage:
        'La estructura interna del PDF está dañada y no puede renderizarse de forma segura. Puedes reportar este ejemplar.',
      technicalReason: errMsg,
      canReport: true,
      details: baseDetails,
    };
  }
}

/**
 * Genera un PDF sintético de 1 página 100% válido según la especificación PDF 1.4
 * con tabla xref calculada con precisión exacta de bytes.
 */
export function buildSyntheticValidPdfBytes(title = 'LeerEsPensar Muestra Segura'): Uint8Array {
  const safeTitle = title.replace(/[()\\]/g, '');
  const streamBody = `BT /F1 18 Tf 72 720 Td (${safeTitle}) Tj ET`;

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdf);
}

export function buildTruncatedPdfBytes(): Uint8Array {
  const valid = buildSyntheticValidPdfBytes('Archivo Truncado');
  return valid.slice(0, Math.floor(valid.length * 0.45));
}

export function buildCorruptedPdfBytes(): Uint8Array {
  return new TextEncoder().encode(
    '%PDF-1.7\n1 0 obj\n<< /CorruptData [###INVALID_STREAM### >>\n%%EOF\n',
  );
}
