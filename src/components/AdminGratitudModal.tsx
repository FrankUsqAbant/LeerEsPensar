import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Heart, Lock, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { adminGratitud } from '../data/gratitud';
import type { GratitudeEntry } from '../utils/gratitud';
import { formatGratitudeName } from '../utils/gratitud';

export interface AdminGratitudModalProps {
  open: boolean;
  onClose: () => void;
  muro: GratitudeEntry[];
  onMuroChange: (muro: GratitudeEntry[]) => void;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const campo =
  'w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--room-field)] text-[var(--room-ink)] placeholder:text-[var(--room-ink-soft)] border border-[var(--room-line)] focus:outline-none focus:ring-2 focus:ring-[var(--room-accent)]/40';

/**
 * Panel de Frank (enlace «adm» del pie): con su código registra a quien donó
 * ("María G.") o lo quita. El código vive solo en memoria mientras el panel está abierto.
 */
export function AdminGratitudModal({ open, onClose, muro, onMuroChange }: AdminGratitudModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [codigo, setCodigo] = useState('');
  const [verificado, setVerificado] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primerCampo = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setCodigo('');
      setVerificado(false);
      setNombre('');
      setApellido('');
      setMensaje(null);
      return;
    }
    primerCampo.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (verificado) primerCampo.current?.focus();
  }, [verificado]);

  const vistaPrevia = formatGratitudeName(nombre, apellido);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const r = await adminGratitud(codigo, { accion: 'verificar' });
    setEnviando(false);
    if (r.ok) {
      setVerificado(true);
      setMensaje(null);
      if (r.muro) onMuroChange(r.muro);
    } else {
      setMensaje({ tipo: 'error', texto: r.error ?? 'Código incorrecto.' });
    }
  };

  const registrar = async (e: FormEvent) => {
    e.preventDefault();
    if (!vistaPrevia) {
      setMensaje({ tipo: 'error', texto: 'Escribe un nombre y un apellido válidos (solo letras).' });
      return;
    }
    setEnviando(true);
    const r = await adminGratitud(codigo, { accion: 'registrar', nombre, apellido });
    setEnviando(false);
    if (r.ok && r.muro) {
      onMuroChange(r.muro);
      setMensaje({ tipo: 'ok', texto: `Registrado: ${r.registrado?.nombre ?? vistaPrevia} — ya aparece en el muro.` });
      setNombre('');
      setApellido('');
      primerCampo.current?.focus();
    } else {
      setMensaje({ tipo: 'error', texto: r.error ?? 'No se pudo registrar.' });
    }
  };

  const quitar = async (entrada: GratitudeEntry) => {
    if (!window.confirm(`¿Quitar a ${entrada.nombre} del muro?`)) return;
    const r = await adminGratitud(codigo, { accion: 'quitar', id: entrada.id });
    if (r.ok && r.muro) {
      onMuroChange(r.muro);
      setMensaje({ tipo: 'ok', texto: `Quitado: ${entrada.nombre}.` });
    } else {
      setMensaje({ tipo: 'error', texto: r.error ?? 'No se pudo quitar.' });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.4 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-[#1A1917]/55 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-gratitud-titulo"
            data-testid="admin-gratitud"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative w-full max-w-md my-auto rounded-2xl bg-[var(--room-page)] text-[var(--room-ink)] border border-[var(--room-line)] shadow-[0_40px_80px_-30px_rgba(20,12,4,0.55)] p-6 sm:p-7"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar administración"
              className="absolute top-3 right-3 p-2 rounded-full text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-field)]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {!verificado ? (
              <form onSubmit={(e) => void entrar(e)} className="space-y-4">
                <div>
                  <Lock className="w-5 h-5 text-[var(--room-accent)]" aria-hidden="true" />
                  <h2 id="admin-gratitud-titulo" className="mt-2 font-serif text-2xl">Administración</h2>
                  <p className="text-sm text-[var(--room-ink-soft)] mt-1">Escribe tu código de administrador.</p>
                </div>
                <input
                  ref={primerCampo}
                  type="password"
                  autoComplete="current-password"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  aria-label="Código de administrador"
                  className={campo}
                />
                {mensaje && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{mensaje.texto}</p>}
                <button
                  type="submit"
                  disabled={!codigo || enviando}
                  className="w-full px-5 py-2.5 rounded-full bg-[var(--room-ink)] text-[var(--room-page)] text-sm font-medium disabled:opacity-50"
                >
                  {enviando ? 'Comprobando…' : 'Entrar'}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div>
                  <Heart className="w-5 h-5 text-[var(--room-accent)]" aria-hidden="true" />
                  <h2 id="admin-gratitud-titulo" className="mt-2 font-serif text-2xl">Registrar un aporte</h2>
                  <p className="text-sm text-[var(--room-ink-soft)] mt-1">
                    Cuando te llegue un Yape o PayPal, escribe el nombre de quien donó.
                  </p>
                </div>

                <form onSubmit={(e) => void registrar(e)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      ref={primerCampo}
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        setMensaje(null);
                      }}
                      placeholder="María José"
                      aria-label="Nombre"
                      className={campo}
                    />
                    <input
                      value={apellido}
                      onChange={(e) => {
                        setApellido(e.target.value);
                        setMensaje(null);
                      }}
                      placeholder="González"
                      aria-label="Apellido"
                      className={campo}
                    />
                  </div>
                  <p className="text-sm text-[var(--room-ink-soft)]">
                    Se mostrará como:{' '}
                    <span className="font-serif italic text-[var(--room-ink)]">{vistaPrevia ?? '—'}</span>
                  </p>
                  {mensaje && (
                    <p
                      role={mensaje.tipo === 'error' ? 'alert' : 'status'}
                      className={`text-xs ${mensaje.tipo === 'error' ? 'text-red-600 dark:text-red-400' : 'text-[#4A7A52] dark:text-[#9CC7A2]'}`}
                    >
                      {mensaje.texto}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={enviando}
                    data-testid="admin-registrar"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--room-ink)] text-[var(--room-page)] text-sm font-medium disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    {enviando ? 'Registrando…' : 'Registrar'}
                  </button>
                </form>

                <div className="border-t border-[var(--room-line)] pt-4">
                  <p className="text-xs text-[var(--room-ink-soft)] mb-2">
                    En el muro ({muro.length}) · puedes quitar uno si te equivocas
                  </p>
                  <ul className="max-h-52 overflow-y-auto divide-y divide-[var(--room-line)]">
                    {muro.map((entrada) => (
                      <li key={entrada.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span>
                          <span className="font-serif italic">{entrada.nombre}</span>
                          <span className="text-xs text-[var(--room-ink-soft)] ml-2 tabular-nums">{entrada.fecha}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void quitar(entrada)}
                          aria-label={`Quitar a ${entrada.nombre}`}
                          className="p-1.5 rounded-full text-[var(--room-ink-soft)] hover:text-red-600 hover:bg-[var(--room-field)]"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                    {muro.length === 0 && <li className="py-2 text-xs text-[var(--room-ink-soft)]">Aún no hay nombres.</li>}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
