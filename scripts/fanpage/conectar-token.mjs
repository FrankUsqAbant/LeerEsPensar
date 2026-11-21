/**
 * Conecta la fan page al sitio sin mostrar la llave en pantalla.
 *
 * 1. Copia el token de USUARIO ampliado del Depurador de tokens de Meta.
 * 2. Ejecuta: node scripts/fanpage/conectar-token.mjs y pégalo cuando lo pida (no se ve).
 *
 * Pide a Facebook la llave de la página "Leer es Pensar"
 * (con un token de usuario ampliado, la llave de la página no caduca), comprueba
 * que no caduca y la guarda como secreto FB_PAGE_TOKEN en Cloudflare Pages.
 * Al terminar vacía el portapapeles. Nunca imprime la llave.
 */
import { execFileSync, spawn } from 'node:child_process';
import { buscarWrangler, REPO } from '../biblioteca/wrangler.mjs';

const PAGE_ID = '100938055347228';
const VERSION = 'v27.0';
const PROYECTO = 'leer-es-pensar';
const graph = (ruta) => `https://graph.facebook.com/${VERSION}/${ruta}`;

const vaciarPortapapeles = () =>
  execFileSync('powershell', ['-NoProfile', '-Command', 'Set-Clipboard -Value " "']);

async function guardarSecreto(nombre, valor) {
  const bin = await buscarWrangler();
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [bin, 'pages', 'secret', 'put', nombre, '--project-name', PROYECTO], {
      cwd: REPO,
      env: { ...process.env, CI: '1' },
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
    child.stdin.end(valor);
  });
}

/** Pide el token en la terminal sin mostrarlo (como `wrangler secret put`). */
async function pedirOculto(pregunta) {
  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  let mostrar = true;
  rl._writeToOutput = (s) => {
    if (mostrar) process.stdout.write(s);
  };
  return new Promise((resolve) => {
    rl.question(pregunta, (v) => {
      rl.close();
      process.stdout.write('\n');
      resolve(v.trim());
    });
    mostrar = false;
  });
}

const usuario = await pedirOculto('Pega el token ampliado (no se verá) y pulsa Enter: ');
if (!/^EA[A-Za-z0-9]{50,}$/.test(usuario)) {
  console.error('✗ Eso no parece un token de Facebook (empieza con EA). Copia el token ampliado y vuelve a ejecutar.');
  process.exit(1);
}

const cuentas = await fetch(graph(`me/accounts?fields=id,name,access_token&limit=100&access_token=${usuario}`)).then((r) => r.json());
if (cuentas.error) {
  console.error(`✗ Facebook: ${cuentas.error.message}`);
  process.exit(1);
}
const pagina = (cuentas.data ?? []).find((p) => p.id === PAGE_ID);
if (!pagina?.access_token) {
  console.error('✗ Ese token no tiene acceso a la página "Leer es Pensar". Vuelve a dar permiso a la página.');
  process.exit(1);
}

const info = await fetch(graph(`debug_token?input_token=${pagina.access_token}&access_token=${pagina.access_token}`)).then((r) => r.json());
const datos = info.data ?? {};
const permisos = datos.scopes ?? [];
const caduca = datos.expires_at ? new Date(datos.expires_at * 1000).toLocaleString('es-PE') : 'nunca';
console.log(`Página: ${pagina.name} · caduca: ${caduca} · publicar: ${permisos.includes('pages_manage_posts') ? 'sí' : 'NO'}`);
if (!permisos.includes('pages_manage_posts')) {
  console.error('✗ Falta el permiso pages_manage_posts.');
  process.exit(1);
}
if (datos.expires_at) console.warn('⚠ Esta llave caduca: usa el token de usuario AMPLIADO (botón "Ampliar token de acceso").');

const r = await guardarSecreto('FB_PAGE_TOKEN', pagina.access_token);
vaciarPortapapeles();
if (r.code !== 0) {
  console.error('✗ No se pudo guardar en Cloudflare:\n' + r.out.replace(/EA[A-Za-z0-9]{20,}/g, '[oculto]'));
  process.exit(1);
}
console.log('✓ Llave guardada en Cloudflare (FB_PAGE_TOKEN). Portapapeles vaciado.');
