#!/usr/bin/env node
/**
 * Inventario de la biblioteca local (SOLO LECTURA: no mueve, renombra ni borra nada).
 *
 * Uso:
 *   node scripts/biblioteca/inventario.mjs "C:\ruta\a\los\libros"
 *
 * Genera en scripts/biblioteca/salida/ (carpeta ignorada por git):
 *   - inventario.json  → un registro por PDF (ruta, tamaño, autor/título del nombre, estado)
 *   - inventario.md    → resumen legible: totales, duplicados, dañados, pesados
 *
 * Para no cargar la laptop: los duplicados se buscan primero por tamaño y solo se
 * calcula la huella (SHA-1) de los archivos que comparten tamaño exacto.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2];
if (!ROOT) {
  console.error('Falta la ruta: node scripts/biblioteca/inventario.mjs "C:\\ruta\\libros"');
  process.exit(1);
}

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'salida');
const MB = 1024 * 1024;
const FREE_TIER_BYTES = 10 * 1024 ** 3;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

/** Lee solo el inicio y el final del archivo para detectar PDFs dañados o cortados. */
async function checkPdf(file, size) {
  const fh = await open(file, 'r');
  try {
    const head = Buffer.alloc(Math.min(1024, size));
    await fh.read(head, 0, head.length, 0);
    const tailLen = Math.min(4096, size);
    const tail = Buffer.alloc(tailLen);
    await fh.read(tail, 0, tailLen, size - tailLen);
    if (size === 0) return 'vacío';
    if (!head.toString('latin1').includes('%PDF-')) return 'no es PDF';
    if (!tail.toString('latin1').includes('%%EOF')) return 'posiblemente cortado';
    return 'ok';
  } finally {
    await fh.close();
  }
}

function sha1(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1');
    createReadStream(file).on('data', (c) => hash.update(c)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

/** "Autor - Título.pdf" → { autor, titulo }. Si no sigue el patrón, autor queda vacío. */
function parseName(file) {
  const base = path.basename(file).replace(/\.pdf$/i, '').trim();
  const idx = base.indexOf(' - ');
  if (idx > 0) return { autor: base.slice(0, idx).trim(), titulo: base.slice(idx + 3).trim() };
  return { autor: '', titulo: base };
}

const normalize = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const fmt = (bytes) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / MB).toFixed(1)} MB`);

const records = [];
const otros = [];
let scanned = 0;

for await (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (!/\.pdf$/i.test(file)) {
    otros.push(rel);
    continue;
  }
  const { size } = await stat(file);
  const estado = await checkPdf(file, size);
  records.push({ ruta: rel, carpeta: rel.split(path.sep)[0], bytes: size, ...parseName(file), estado });
  scanned += 1;
  if (scanned % 250 === 0) console.log(`  … ${scanned} PDFs revisados`);
}

// Duplicados exactos: mismo tamaño → misma huella.
const bySize = new Map();
for (const r of records) bySize.set(r.bytes, [...(bySize.get(r.bytes) ?? []), r]);
const exactDupGroups = [];
for (const group of bySize.values()) {
  if (group.length < 2) continue;
  const byHash = new Map();
  for (const r of group) {
    r.sha1 = await sha1(path.join(ROOT, r.ruta));
    byHash.set(r.sha1, [...(byHash.get(r.sha1) ?? []), r]);
  }
  for (const g of byHash.values()) if (g.length > 1) exactDupGroups.push(g);
}

// Mismo autor + título con distinto archivo (otra edición o versión).
const byTitle = new Map();
for (const r of records) {
  const key = `${normalize(r.autor)}|${normalize(r.titulo)}`;
  byTitle.set(key, [...(byTitle.get(key) ?? []), r]);
}
const exactKeys = new Set(exactDupGroups.flat().map((r) => r.ruta));
const sameTitleGroups = [...byTitle.values()].filter((g) => g.length > 1 && !g.every((r) => exactKeys.has(r.ruta)));

const total = records.reduce((a, r) => a + r.bytes, 0);
const dupSaving = exactDupGroups.reduce((a, g) => a + g[0].bytes * (g.length - 1), 0);
const danados = records.filter((r) => r.estado !== 'ok');
const conPatron = records.filter((r) => r.autor).length;
const buckets = [
  ['menos de 5 MB', 0, 5 * MB],
  ['5 a 20 MB', 5 * MB, 20 * MB],
  ['20 a 50 MB', 20 * MB, 50 * MB],
  ['más de 50 MB', 50 * MB, Infinity],
].map(([label, lo, hi]) => {
  const items = records.filter((r) => r.bytes >= lo && r.bytes < hi);
  return { label, count: items.length, bytes: items.reduce((a, r) => a + r.bytes, 0) };
});
const porCarpeta = [...new Set(records.map((r) => r.carpeta))].sort().map((c) => {
  const items = records.filter((r) => r.carpeta === c);
  return { c, n: items.length, bytes: items.reduce((a, r) => a + r.bytes, 0) };
});
const pesados = [...records].sort((a, b) => b.bytes - a.bytes).slice(0, 15);

const md = [
  '# Inventario de la biblioteca',
  '',
  `Generado: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
  '',
  '## Totales',
  `- PDFs: **${records.length}** · peso total: **${fmt(total)}**`,
  `- Cabe en los 10 GB gratis de R2: **${total <= FREE_TIER_BYTES ? 'sí' : 'no'}** (${((total / FREE_TIER_BYTES) * 100).toFixed(0)} % del límite)`,
  `- Siguen el patrón "Autor - Título": ${conPatron} de ${records.length} (${((conPatron / records.length) * 100).toFixed(0)} %)`,
  `- Duplicados exactos: ${exactDupGroups.length} grupos · se ahorran ${fmt(dupSaving)} quitándolos`,
  `- Mismo autor y título, distinto archivo: ${sameTitleGroups.length} grupos`,
  `- Con problemas: ${danados.length}`,
  `- Otros archivos (no PDF): ${otros.length}`,
  '',
  '## Por carpeta',
  '| Carpeta | PDFs | Peso |',
  '|---|---:|---:|',
  ...porCarpeta.map((x) => `| ${x.c} | ${x.n} | ${fmt(x.bytes)} |`),
  '',
  '## Por tamaño',
  '| Rango | PDFs | Peso |',
  '|---|---:|---:|',
  ...buckets.map((b) => `| ${b.label} | ${b.count} | ${fmt(b.bytes)} |`),
  '',
  '## Los 15 más pesados',
  ...pesados.map((r) => `- ${fmt(r.bytes)} · ${r.ruta}`),
  '',
  '## Con problemas',
  ...(danados.length ? danados.map((r) => `- ${r.estado} · ${r.ruta}`) : ['- Ninguno']),
  '',
  '## Duplicados exactos (mismo contenido)',
  ...(exactDupGroups.length
    ? exactDupGroups.map((g) => `- ${fmt(g[0].bytes)} · ${g.map((r) => r.ruta).join('  ⟷  ')}`)
    : ['- Ninguno']),
  '',
  '## Mismo autor y título, distinto archivo',
  ...(sameTitleGroups.length
    ? sameTitleGroups.map((g) => `- ${g.map((r) => `${r.ruta} (${fmt(r.bytes)})`).join('  ⟷  ')}`)
    : ['- Ninguno']),
  '',
  '## Otros archivos (no PDF)',
  ...(otros.length ? otros.map((o) => `- ${o}`) : ['- Ninguno']),
  '',
].join('\n');

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'inventario.json'), JSON.stringify({ raiz: ROOT, total, records, otros }, null, 2));
await writeFile(path.join(OUT_DIR, 'inventario.md'), md);
console.log(`\nListo: ${records.length} PDFs, ${fmt(total)}. Reporte en scripts/biblioteca/salida/inventario.md`);
