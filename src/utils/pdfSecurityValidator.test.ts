import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCorruptedPdfBytes,
  buildSyntheticValidPdfBytes,
  buildTruncatedPdfBytes,
  inspectPdfBytes,
  validatePdfFile,
} from './pdfSecurityValidator';

test('inspectPdfBytes accepts valid synthetic PDF 1.4 bytes', () => {
  const bytes = buildSyntheticValidPdfBytes('LeerEsPensar Test');
  const result = inspectPdfBytes(bytes, 'ficciones.pdf', 'application/pdf');
  assert.equal(result.valid, true);
  assert.equal(result.pdfVersion, '1.4');
  assert.equal(result.hasEndOfFileMarker, true);
  assert.equal(result.containsActiveScripts, false);
});

test('inspectPdfBytes rejects empty files with EMPTY_FILE', () => {
  const result = inspectPdfBytes(new Uint8Array(0), 'vacio.pdf', 'application/pdf');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'EMPTY_FILE');
});

test('inspectPdfBytes rejects non-PDF magic bytes', () => {
  const fakeBytes = new TextEncoder().encode('<html><body>Not a PDF</body></html>');
  const result = inspectPdfBytes(fakeBytes, 'falso.pdf', 'application/pdf');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'INVALID_MAGIC_BYTES');
});

test('inspectPdfBytes rejects truncated PDFs missing %%EOF', () => {
  const truncated = buildTruncatedPdfBytes();
  const result = inspectPdfBytes(truncated, 'truncado.pdf', 'application/pdf');
  assert.equal(result.valid, false);
  assert.equal(result.errorCode, 'TRUNCATED_FILE');
  assert.equal(result.hasEndOfFileMarker, false);
});

test('inspectPdfBytes rejects oversized PDFs and invalid MIME types', () => {
  const bytes = buildSyntheticValidPdfBytes();
  const tooBig = inspectPdfBytes(bytes, 'grande.pdf', 'application/pdf', 100);
  assert.equal(tooBig.valid, false);
  assert.equal(tooBig.errorCode, 'FILE_TOO_LARGE');

  const wrongMime = inspectPdfBytes(bytes, 'imagen.png', 'image/png');
  assert.equal(wrongMime.valid, false);
  assert.equal(wrongMime.errorCode, 'INVALID_MIME_TYPE');
});

test('inspectPdfBytes detects embedded JavaScript markers without failing header', () => {
  const malicious = new TextEncoder().encode(
    '%PDF-1.7\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >> endobj\n%%EOF\n',
  );
  const result = inspectPdfBytes(malicious, 'script.pdf', 'application/pdf');
  assert.equal(result.containsActiveScripts, true);
});

test('validatePdfFile sets canReport=true for truncated and corrupted buffers', async () => {
  const truncatedResult = await validatePdfFile(buildTruncatedPdfBytes(), {
    fileName: 'truncado.pdf',
    skipPdfJsParsing: true,
  });
  assert.equal(truncatedResult.valid, false);
  assert.equal(truncatedResult.canReport, true);

  const validResult = await validatePdfFile(buildSyntheticValidPdfBytes(), {
    fileName: 'valido.pdf',
    skipPdfJsParsing: true,
  });
  assert.equal(validResult.valid, true);
  assert.ok(validResult.details.sha256 && validResult.details.sha256.length === 64);

  const corruptCheck = inspectPdfBytes(buildCorruptedPdfBytes(), 'corrupto.pdf', 'application/pdf');
  assert.equal(corruptCheck.pdfVersion, '1.7');
});
