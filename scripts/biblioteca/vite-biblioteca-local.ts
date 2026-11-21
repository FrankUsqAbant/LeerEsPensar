/**
 * Puente SOLO PARA DESARROLLO (vite dev): imita las funciones de Cloudflare
 * /api/catalogo y /pdf/libros/* usando los archivos locales de scripts/biblioteca/salida.
 * Así se prueba la biblioteca completa sin publicar nada. No existe en la versión publicada.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { formatGratitudeName } from '../../src/utils/gratitud';

export function bibliotecaLocal(repoRoot: string): Plugin {
  const salida = path.join(repoRoot, 'scripts', 'biblioteca', 'salida');
  const leer = (archivo: string) => {
    const ruta = path.join(salida, archivo);
    return fs.existsSync(ruta) ? JSON.parse(fs.readFileSync(ruta, 'utf8')) : null;
  };

  return {
    name: 'biblioteca-local',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/catalogo', (_req, res) => {
        const publico = leer('catalogo-publico.json');
        res.statusCode = publico ? 200 : 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(publico ?? { ok: false, error: 'Sin catálogo local' }));
      });

      // Muro de gratitud en memoria (solo desarrollo). Código de administrador de prueba: "dev".
      const muro: Array<{ id: string; nombre: string; fecha: string }> = [];
      const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(body));
      };
      server.middlewares.use('/api/gratitud-admin', (req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          const body = JSON.parse(raw || '{}');
          if (body.codigo !== 'dev') return json(res, 401, { ok: false, error: 'Código de administrador incorrecto.' });
          if (body.accion === 'registrar') {
            const nombre = formatGratitudeName(String(body.nombre ?? ''), String(body.apellido ?? ''));
            if (!nombre) return json(res, 400, { ok: false, error: 'Escribe un nombre y un apellido válidos (solo letras).' });
            const entrada = { id: `dev-${Date.now()}`, nombre, fecha: new Date().toISOString().slice(0, 10) };
            muro.unshift(entrada);
            return json(res, 200, { ok: true, registrado: entrada, muro });
          }
          if (body.accion === 'quitar') {
            const i = muro.findIndex((e) => e.id === body.id);
            if (i >= 0) muro.splice(i, 1);
          }
          return json(res, 200, { ok: true, muro });
        });
      });
      server.middlewares.use('/api/gratitud', (_req, res) => json(res, 200, { ok: true, muro }));

      // Publicaciones para la fan page en memoria (sin Facebook ni IA en desarrollo).
      const pendientesFb: Array<Record<string, string>> = [];
      const leerCuerpo = (req: import('node:http').IncomingMessage) =>
        new Promise<Record<string, unknown>>((resolve) => {
          let raw = '';
          req.on('data', (c) => (raw += c));
          req.on('end', () => resolve(JSON.parse(raw || '{}')));
        });
      server.middlewares.use('/api/compartir-admin', async (req, res) => {
        const body = await leerCuerpo(req);
        if (body.codigo !== 'dev') return json(res, 401, { ok: false, error: 'Código de administrador incorrecto.' });
        if (body.accion === 'descartar' || body.accion === 'marcar') {
          const i = pendientesFb.findIndex((p) => p.id === body.id);
          if (i >= 0) pendientesFb.splice(i, 1);
        }
        if (body.accion === 'resumen') return json(res, 400, { ok: false, error: 'La IA no está configurada.' });
        if (body.accion === 'publicar') return json(res, 400, { ok: false, error: 'Facebook no está conectado todavía.' });
        return json(res, 200, { ok: true, pendientes: pendientesFb, facebook: false, ia: false });
      });
      server.middlewares.use('/api/compartir', async (req, res) => {
        const body = await leerCuerpo(req);
        const nombre = formatGratitudeName(String(body.nombre ?? ''), String(body.apellido ?? ''));
        if (!nombre) return json(res, 400, { ok: false, error: 'Escribe tu nombre y apellido (solo letras).' });
        pendientesFb.unshift({
          id: `dev-${Date.now()}`,
          libroId: String(body.libroId ?? ''),
          titulo: String(body.titulo ?? ''),
          autor: String(body.autor ?? ''),
          nombre,
          comentario: String(body.comentario ?? '').slice(0, 240),
          fecha: new Date().toISOString().slice(0, 10),
        });
        return json(res, 200, { ok: true, nombre });
      });

      server.middlewares.use('/portada', (req, res, next) => {
        const nombre = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname).replace(/^\//, '');
        const archivo = path.join(salida, 'portadas', nombre);
        if (!/^[a-z0-9-]+\.webp$/.test(nombre) || !fs.existsSync(archivo)) return next();
        res.setHeader('Content-Type', 'image/webp');
        fs.createReadStream(archivo).pipe(res);
      });

      server.middlewares.use('/pdf/libros', (req, res, next) => {
        const local = leer('catalogo-local.json');
        const url = new URL(req.url ?? '/', 'http://localhost');
        const clave = `libros${decodeURIComponent(url.pathname)}`;
        const libro = local?.libros.find((b: { r2Key: string }) => b.r2Key === clave);
        if (!libro) return next();
        const archivo = path.join(local.raiz, libro.origen);
        const nombre = url.searchParams.get('nombre') || path.basename(clave, '.pdf');
        const modo = url.searchParams.get('descargar') === '1' ? 'attachment' : 'inline';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', String(fs.statSync(archivo).size));
        res.setHeader('Content-Disposition', `${modo}; filename*=UTF-8''${encodeURIComponent(`${nombre}.pdf`)}`);
        fs.createReadStream(archivo).pipe(res);
      });
    },
  };
}
