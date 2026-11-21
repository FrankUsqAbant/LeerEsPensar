#!/usr/bin/env node
/**
 * Sube los PDFs del catálogo a Cloudflare R2 con wrangler (usa tu sesión `wrangler login`,
 * no necesita claves). Es REANUDABLE: guarda lo subido en salida/subidos.json y, si se
 * corta, al volver a ejecutarlo continúa donde quedó.
 *
 * Uso:
 *   node scripts/biblioteca/subir.mjs --prueba 3     # sube solo 3 libros (los más livianos)
 *   node scripts/biblioteca/subir.mjs                # sube todo lo pendiente
 *   node scripts/biblioteca/subir.mjs --simular      # muestra qué subiría, sin subir
 *
 * Requiere haber ejecutado antes: inventario.mjs y catalogo.py.
 */
import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUCKET, wrangler as run } from './wrangler.mjs';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'salida');
const ESTADO = path.join(SALIDA, 'subidos.json');
const LOG = path.join(SALIDA, 'subida.log');

const args = process.argv.slice(2);
const simular = args.includes('--simular');
const prueba = args.includes('--prueba') ? Number(args[args.indexOf('--prueba') + 1] || 3) : 0;

const log = (line) => appendFile(LOG, `${new Date().toISOString()} ${line}\n`);
const fmt = (b) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(1)} MB`);

const catalogo = JSON.parse(await readFile(path.join(SALIDA, 'catalogo-local.json'), 'utf8'));
const subidos = existsSync(ESTADO) ? JSON.parse(await readFile(ESTADO, 'utf8')) : {};

let pendientes = catalogo.libros.filter((b) => subidos[b.r2Key]?.bytes !== b.bytes);
if (prueba) pendientes = [...pendientes].sort((a, b) => a.bytes - b.bytes).slice(0, prueba);
const totalBytes = pendientes.reduce((a, b) => a + b.bytes, 0);
console.log(`Pendientes: ${pendientes.length} libros (${fmt(totalBytes)}) · ya subidos: ${Object.keys(subidos).length}`);
if (simular) {
  pendientes.slice(0, 10).forEach((b) => console.log(`  ${b.r2Key}  ←  ${b.origen}`));
  process.exit(0);
}

let hechos = 0;
let bytesHechos = 0;
let fallidos = 0;
const inicio = Date.now();
for (const libro of pendientes) {
  const archivo = path.join(catalogo.raiz, libro.origen);
  let ok = false;
  let ultimo = '';
  for (let intento = 1; intento <= 3 && !ok; intento += 1) {
    const { code, out } = await run([
      'r2', 'object', 'put', `${BUCKET}/${libro.r2Key}`,
      '--file', archivo,
      '--content-type', 'application/pdf',
      '--remote',
    ]);
    ok = code === 0 && /Upload complete/i.test(out);
    ultimo = out.trim().split('\n').slice(-3).join(' | ');
    if (!ok) await new Promise((r) => setTimeout(r, 3000 * intento));
  }
  if (ok) {
    subidos[libro.r2Key] = { bytes: libro.bytes, fecha: new Date().toISOString() };
    await writeFile(ESTADO, JSON.stringify(subidos, null, 1));
    hechos += 1;
    bytesHechos += libro.bytes;
    await log(`OK ${libro.r2Key} ${libro.bytes}`);
  } else {
    fallidos += 1;
    await log(`FALLO ${libro.r2Key} ← ${libro.origen} :: ${ultimo}`);
  }
  const seg = (Date.now() - inicio) / 1000;
  const ritmo = bytesHechos / Math.max(1, seg);
  const resta = ritmo > 0 ? (totalBytes - bytesHechos) / ritmo / 60 : 0;
  console.log(`[${hechos + fallidos}/${pendientes.length}] ${ok ? 'OK ' : 'FALLO'} ${libro.r2Key} · ${fmt(bytesHechos)} de ${fmt(totalBytes)}` +
    (hechos > 2 ? ` · faltan ~${Math.ceil(resta)} min` : ''));
}
console.log(`\nTerminado: ${hechos} subidos, ${fallidos} con error (ver salida/subida.log). Ejecútalo de nuevo para reintentar los fallidos.`);
