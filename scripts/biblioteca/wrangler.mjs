/**
 * Utilidades compartidas para usar wrangler desde los scripts de la biblioteca.
 * wrangler no es dependencia del proyecto: se usa el del proyecto si existe o,
 * si no, la versión más nueva en la caché de npx (la que usa `npx wrangler`).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUCKET = 'leer-es-pensar-books';
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function buscarWrangler() {
  const local = path.join(REPO, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  if (existsSync(local)) return local;
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  const candidatos = [];
  for (const dir of existsSync(cache) ? await readdir(cache) : []) {
    const pkg = path.join(cache, dir, 'node_modules', 'wrangler', 'package.json');
    if (existsSync(pkg)) {
      const { version } = JSON.parse(await readFile(pkg, 'utf8'));
      candidatos.push({ version, bin: path.join(path.dirname(pkg), 'bin', 'wrangler.js') });
    }
  }
  candidatos.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  if (!candidatos.length) throw new Error('No encontré wrangler: ejecuta antes "npx wrangler whoami".');
  return candidatos[0].bin;
}

/** Ejecuta wrangler y devuelve { code, out } con la salida combinada. */
export async function wrangler(argv) {
  const bin = await buscarWrangler();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, ...argv], { cwd: REPO, env: { ...process.env, CI: '1' } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}
