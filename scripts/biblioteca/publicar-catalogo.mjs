#!/usr/bin/env node
/**
 * Publica el catálogo que lee el sitio.
 *
 *   node scripts/biblioteca/publicar-catalogo.mjs            # solo genera salida/catalogo-publico.json
 *   node scripts/biblioteca/publicar-catalogo.mjs --subir    # además lo sube a R2 como catalogo.json
 *
 * Solo incluye libros que YA están en R2 (según salida/subidos.json), así el sitio nunca
 * muestra un libro que todavía no se puede descargar. No incluye rutas locales.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUCKET, wrangler } from './wrangler.mjs';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'salida');
const destino = path.join(SALIDA, 'catalogo-publico.json');

const local = JSON.parse(await readFile(path.join(SALIDA, 'catalogo-local.json'), 'utf8'));
const subidos = existsSync(path.join(SALIDA, 'subidos.json'))
  ? JSON.parse(await readFile(path.join(SALIDA, 'subidos.json'), 'utf8'))
  : {};
// Portadas reales: solo si se aprobó (usable) y ya está en R2.
const leerJson = async (nombre) =>
  existsSync(path.join(SALIDA, nombre)) ? JSON.parse(await readFile(path.join(SALIDA, nombre), 'utf8')) : {};
const portadas = await leerJson('portadas.json');
const portadasSubidas = await leerJson('portadas-subidas.json');

const libros = local.libros
  .filter((b) => subidos[b.r2Key]?.bytes === b.bytes)
  .map((b) => ({
    id: b.slug,
    titulo: b.titulo,
    autor: b.autor,
    anio: b.anio ?? null,
    paginas: b.paginas ?? null,
    bytes: b.bytes,
    genero: b.genero,
    clave: b.r2Key,
    agregado: (subidos[b.r2Key].fecha ?? '').slice(0, 10),
    ...(portadas[b.slug]?.usable && portadasSubidas[b.slug]
      ? { portada: true, puntaje: portadas[b.slug].puntaje }
      : {}),
  }))
  .sort((a, b) => a.autor.localeCompare(b.autor, 'es') || a.titulo.localeCompare(b.titulo, 'es'));

const catalogo = { version: 1, generado: new Date().toISOString(), total: libros.length, libros };
await writeFile(destino, JSON.stringify(catalogo));
console.log(`Catálogo público: ${libros.length} libros de ${local.libros.length}, ${libros.filter((b) => b.portada).length} con portada real (${(JSON.stringify(catalogo).length / 1024).toFixed(0)} KB)`);

if (process.argv.includes('--subir')) {
  const { code, out } = await wrangler([
    'r2', 'object', 'put', `${BUCKET}/catalogo.json`,
    '--file', destino,
    '--content-type', 'application/json; charset=utf-8',
    '--remote',
  ]);
  console.log(code === 0 && /Upload complete/i.test(out) ? 'Subido a R2 como catalogo.json' : `Error al subir:\n${out}`);
  process.exitCode = code === 0 ? 0 : 1;
}
