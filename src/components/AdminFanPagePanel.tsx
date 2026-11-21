import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Send, Sparkles, Trash2 } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { adminCompartir } from '../data/fanPage';
import { coverThemeFor } from '../data/library';
import type { BookIndexEntry } from '../types/folio';
import { drawBookShareCard, ensureShareCardFonts, loadShareImage } from '../utils/bookShareCard';
import type { FanPagePost } from '../utils/fanPage';
import { SUMMARY_MAX, buildFanPageCaption } from '../utils/fanPage';

/** Libro mínimo para dibujar la tarjeta a partir de una publicación pendiente. */
function libroDe(post: FanPagePost): BookIndexEntry {
  return {
    id: post.libroId,
    slug: post.libroId,
    title: post.titulo,
    authorId: post.libroId,
    authorName: post.autor,
    genre: 'Sin clasificar',
    moods: [],
    publicationYear: 0,
    pageCount: 0,
    readingTimeMinutes: 0,
    language: 'es',
    coverTheme: coverThemeFor(post.libroId),
    hookSummary: '',
    takeaways: [],
    firstSip: '',
    pdfUrl: '',
    pdfSizeBytes: 0,
  };
}

const boton =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full border border-[var(--room-line)] bg-[var(--room-field)] text-xs hover:bg-[var(--room-page)] disabled:opacity-50 transition-colors';

/**
 * Publicaciones para la fan page: los lectores comparten que leyeron un libro y Frank,
 * desde aquí, ve la tarjeta (portada + resumen + "María G. lo leyó"), ajusta el resumen
 * y la publica (sola si Facebook está conectado; si no, en tres clics a mano).
 */
export function AdminFanPagePanel({ codigo, onCount }: { codigo: string; onCount: (n: number) => void }) {
  const [pendientes, setPendientes] = useState<FanPagePost[]>([]);
  const [facebook, setFacebook] = useState(false);
  const [ia, setIa] = useState(false);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [resumen, setResumen] = useState('');
  const [vista, setVista] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const actualizar = useCallback(
    (data: { pendientes?: FanPagePost[]; facebook?: boolean; ia?: boolean }) => {
      if (data.pendientes) {
        setPendientes(data.pendientes);
        onCount(data.pendientes.length);
      }
      if (typeof data.facebook === 'boolean') setFacebook(data.facebook);
      if (typeof data.ia === 'boolean') setIa(data.ia);
    },
    [onCount],
  );

  useEffect(() => {
    void adminCompartir(codigo, { accion: 'listar' }).then((r) => (r.ok ? actualizar(r) : setMensaje({ tipo: 'error', texto: r.error ?? '' })));
  }, [codigo, actualizar]);

  const post = useMemo(() => pendientes.find((p) => p.id === seleccion) ?? null, [pendientes, seleccion]);

  // Dibuja la tarjeta de la publicación elegida (se rehace al cambiar el resumen).
  useEffect(() => {
    if (!post) return;
    let cancelado = false;
    const t = window.setTimeout(async () => {
      await ensureShareCardFonts();
      const portada = await loadShareImage(`/portada/${post.libroId}.webp`);
      if (cancelado) return;
      const canvas = canvasRef.current ?? document.createElement('canvas');
      canvasRef.current = canvas;
      drawBookShareCard(canvas, libroDe(post), window.location.host, { lector: post.nombre, texto: resumen, portada });
      setVista(canvas.toDataURL('image/png'));
    }, 300);
    return () => {
      cancelado = true;
      window.clearTimeout(t);
    };
  }, [post, resumen]);

  const elegir = (id: string) => {
    setSeleccion(id);
    setResumen('');
    setVista(null);
    setMensaje(null);
  };

  const sugerir = async () => {
    if (!post) return;
    setOcupado(true);
    const r = await adminCompartir(codigo, { accion: 'resumen', id: post.id });
    setOcupado(false);
    if (r.ok && r.resumen) setResumen(r.resumen);
    else setMensaje({ tipo: 'error', texto: r.desconocido ? 'La IA no conoce este libro: escribe tú un resumen corto.' : r.error ?? 'No se pudo.' });
  };

  const caption = post ? buildFanPageCaption(post, resumen) : '';

  const publicar = async () => {
    if (!post || !canvasRef.current) return;
    setOcupado(true);
    const r = await adminCompartir(codigo, { accion: 'publicar', id: post.id, resumen, imagen: canvasRef.current.toDataURL('image/png') });
    setOcupado(false);
    if (r.ok) {
      actualizar(r);
      setSeleccion(null);
      setMensaje({ tipo: 'ok', texto: `Publicado en la fan page: «${post.titulo}» de ${post.nombre}.` });
    } else setMensaje({ tipo: 'error', texto: r.error ?? 'No se pudo publicar.' });
  };

  const quitar = async (accion: 'descartar' | 'marcar') => {
    if (!post) return;
    if (accion === 'descartar' && !window.confirm('¿Descartar esta publicación?')) return;
    const r = await adminCompartir(codigo, { accion, id: post.id });
    if (r.ok) {
      actualizar(r);
      setSeleccion(null);
      setMensaje({ tipo: 'ok', texto: accion === 'marcar' ? 'Marcada como publicada.' : 'Descartada.' });
    }
  };

  const descargar = () => {
    if (!vista || !post) return;
    const a = document.createElement('a');
    a.href = vista;
    a.download = `${post.libroId}-${post.nombre.replace(/\W+/g, '')}.png`;
    a.click();
  };

  return (
    <div className="space-y-4" data-testid="admin-fanpage">
      {!facebook && (
        <p className="text-xs rounded-lg border border-[var(--room-line)] bg-[var(--room-field)] px-3 py-2 text-[var(--room-ink-soft)]">
          Facebook aún no está conectado: publica a mano con «Descargar tarjeta» y «Copiar texto».
        </p>
      )}

      {pendientes.length === 0 ? (
        <p className="text-sm text-[var(--room-ink-soft)]">No hay publicaciones pendientes.</p>
      ) : (
        <ul className="max-h-40 overflow-y-auto divide-y divide-[var(--room-line)] text-sm">
          {pendientes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => elegir(p.id)}
                className={`w-full text-left py-2 px-1 rounded ${p.id === seleccion ? 'bg-[var(--room-field)]' : 'hover:bg-[var(--room-field)]/60'}`}
              >
                <span className="font-serif italic">{p.nombre}</span> leyó «{p.titulo}»
                <span className="block text-xs text-[var(--room-ink-soft)] tabular-nums">
                  {p.fecha}
                  {p.comentario ? ` · “${p.comentario}”` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {post && (
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-t border-[var(--room-line)] pt-4">
          <div className="rounded-md overflow-hidden bg-[var(--room-field)] aspect-[4/5]">
            {vista && <img src={vista} alt="Vista previa de la tarjeta" className="w-full h-full object-cover" />}
          </div>
          <div className="space-y-2 min-w-0">
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value.slice(0, SUMMARY_MAX))}
              rows={4}
              placeholder="Resumen corto del libro (2 frases)"
              aria-label="Resumen del libro"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--room-field)] border border-[var(--room-line)] focus:outline-none focus:ring-2 focus:ring-[var(--room-accent)]/40"
            />
            <div className="flex flex-wrap gap-1.5">
              {ia && (
                <button type="button" onClick={() => void sugerir()} disabled={ocupado} className={boton}>
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Sugerir con IA
                </button>
              )}
              {facebook ? (
                <button
                  type="button"
                  onClick={() => void publicar()}
                  disabled={ocupado || !vista}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1877F2] text-white text-xs font-medium disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> {ocupado ? 'Publicando…' : 'Publicar en Facebook'}
                </button>
              ) : (
                <>
                  <button type="button" onClick={descargar} disabled={!vista} className={boton}>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Descargar tarjeta
                  </button>
                  <button type="button" onClick={() => void navigator.clipboard?.writeText(caption)} className={boton}>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" /> Copiar texto
                  </button>
                  <a href={BRAND_CONFIG.facebookUrl} target="_blank" rel="noopener noreferrer" className={boton}>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Fan page
                  </a>
                  <button type="button" onClick={() => void quitar('marcar')} className={boton}>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" /> Ya lo publiqué
                  </button>
                </>
              )}
              <button type="button" onClick={() => void quitar('descartar')} className={`${boton} hover:text-red-600`}>
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={`text-xs ${mensaje.tipo === 'error' ? 'text-red-600 dark:text-red-400' : 'text-[#4A7A52] dark:text-[#9CC7A2]'}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
