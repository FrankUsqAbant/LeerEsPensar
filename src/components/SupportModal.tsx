import { useEffect, useRef } from 'react';
import { ExternalLink, Heart, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BRAND_CONFIG } from '../config/brand';
import { YAPE_QR_SRC, getPaypalUrl } from '../config/support';
import type { GratitudeEntry } from '../utils/gratitud';
import { GratitudeWall } from './GratitudeWall';

export interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  /** Muro de gratitud (nombres registrados por el administrador). */
  muro?: GratitudeEntry[];
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Apoyo voluntario: Yape (QR real) para Perú y PayPal para otros países.
 * Usa los colores de la sala, así se ve bien de día y de noche.
 */
export function SupportModal({ open, onClose, muro = [] }: SupportModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const paypalUrl = getPaypalUrl();

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="support-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.1 : 0.45, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#1A1917]/55 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            data-testid="support-modal"
            onClick={(e) => e.stopPropagation()}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative w-full max-w-2xl my-auto rounded-2xl bg-[var(--room-page)] text-[var(--room-ink)] border border-[var(--room-line)] shadow-[0_40px_80px_-30px_rgba(20,12,4,0.55)]"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Cerrar apoyo"
              className="absolute top-3 right-3 p-2 rounded-full text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-field)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <header className="px-6 sm:px-10 pt-9 pb-6 text-center">
              <Heart className="w-5 h-5 mx-auto text-[var(--room-accent)]" aria-hidden="true" />
              <h2
                id="support-modal-title"
                className="mt-3 font-serif text-3xl sm:text-[2.1rem] font-medium tracking-tight leading-tight"
              >
                Apoya <em className="italic font-normal text-[var(--room-accent)]">{BRAND_CONFIG.name}</em>
              </h2>
              <p className="mt-3 text-sm text-[var(--room-ink-soft)] leading-relaxed max-w-md mx-auto">
                La biblioteca se mantiene con aportes voluntarios del grupo. Cualquier monto ayuda a
                seguir sumando libros.
              </p>
            </header>

            <div className="grid sm:grid-cols-2 border-t border-[var(--room-line)]">
              {/* Perú: Yape */}
              <section className="px-6 sm:px-8 py-7 flex flex-col items-center text-center sm:border-r border-[var(--room-line)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--room-ink-soft)]">
                  Desde Perú
                </p>
                <h3 className="mt-1 font-serif text-xl">Yape</h3>
                <div className="mt-4 rounded-xl bg-white p-2.5 shadow-[0_10px_24px_-14px_rgba(0,0,0,0.45)]">
                  <img
                    src={YAPE_QR_SRC}
                    alt={`Código QR de Yape para apoyar a ${BRAND_CONFIG.name}`}
                    width={496}
                    height={496}
                    decoding="async"
                    className="w-40 h-40 sm:w-44 sm:h-44"
                  />
                </div>
                <p className="mt-3 text-xs text-[var(--room-ink-soft)]">
                  Escanéalo con tu app de Yape
                </p>
              </section>

              {/* Otros países: PayPal */}
              <section className="px-6 sm:px-8 py-7 flex flex-col items-center justify-center text-center border-t sm:border-t-0 border-[var(--room-line)]">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--room-ink-soft)]">
                  Desde cualquier país
                </p>
                <h3 className="mt-1 font-serif text-xl">PayPal</h3>
                <p className="mt-3 text-sm text-[var(--room-ink-soft)] leading-relaxed max-w-[15rem]">
                  Eliges el monto y la moneda en PayPal, con tu cuenta o tarjeta.
                </p>
                <a
                  href={paypalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="support-paypal-link"
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--room-ink)] text-[var(--room-page)] text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)] focus-visible:ring-offset-2"
                >
                  Apoyar con PayPal
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </section>
            </div>

            <GratitudeWall muro={muro} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
