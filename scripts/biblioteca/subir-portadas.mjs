#!/usr/bin/env node
/**
 * Sube a R2 (carpeta portadas/) las miniaturas USABLES generadas por portadas.py.
 * Reanudable (salida/portadas-subidas.json) y con 6 subidas en paralelo.
 *
 *   node scripts/biblioteca/subir-portadas.mjs
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUCKET, wrangler } from './wrangler.mjs';

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'salida');
const ESTADO = path.join(SALIDA, 'portadas-subidas.json');
const PARALELO = 6;

const indice = JSON.parse(await readFile(path.join(SALIDA, 'portadas.json'), 'utf8'));
const subidas = existsSync(ESTADO) ? JSON.parse(await readFile(ESTADO, 'utf8')) : {};
const pendientes = Object.entries(indice)
  .filter(([slug, info]) => info.usable && !subidas[slug])
  .map(([slug]) => slug);

console.log(`Portadas por subir: ${pendientes.length} · ya subidas: ${Object.keys(subidas).length}`);
let hechas = 0;
let fallidas = 0;
let guardando = Promise.resolve();

async function subir(slug) {
  for (let intento = 1; intento <= 3; intento += 1) {
    const { code, out } = await wrangler([
      'r2', 'object', 'put', `${BUCKET}/portadas/${slug}.webp`,
      '--file', path.join(SALIDA, 'portadas', `${slug}.webp`),
      '--content-type', 'image/webp',
      '--remote',
    ]);
    if (code === 0 && /Upload complete/i.test(out)) return true;
    await new Promise((r) => setTimeout(r, 2000 * intento));
  }
  return false;
}

const cola = [...pendientes];
await Promise.all(
  Array.from({ length: PARALELO }, async () => {
    while (cola.length) {
      const slug = cola.shift();
      if (await subir(slug)) {
        subidas[slug] = true;
        hechas += 1;
      } else {
        fallidas += 1;
        console.log(`  FALLO ${slug}`);
      }
      if ((hechas + fallidas) % 25 === 0) {
        guardando = guardando.then(() => writeFile(ESTADO, JSON.stringify(subidas)));
        console.log(`  … ${hechas + fallidas} de ${pendientes.length}`);
      }
    }
  }),
);
await guardando;
await writeFile(ESTADO, JSON.stringify(subidas));
console.log(`Listo: ${hechas} subidas, ${fallidas} con error. Ejecútalo de nuevo para reintentar.`);
