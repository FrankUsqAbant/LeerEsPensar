import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { isRecent } from '../data/gratitud';
import type { GratitudeEntry } from '../utils/gratitud';
import { gratitudePhrase } from '../utils/gratitud';

/**
 * Muro de gratitud: nombres de quienes apoyan la biblioteca ("María G.").
 * Si hay un aporte reciente, la frase de arriba se le dedica; los nuevos llevan «nuevo».
 */
export function GratitudeWall({ muro }: { muro: GratitudeEntry[] }) {
  const prefersReducedMotion = useReducedMotion();
  const masReciente = muro[0];
  const frase = useMemo(() => {
    if (masReciente && isRecent(masReciente)) {
      // Semilla estable por persona: la frase no cambia cada vez que se abre el cuadro.
      const seed = [...masReciente.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7) / 997;
      return gratitudePhrase(masReciente.nombre, seed);
    }
    return 'Gracias a quienes mantienen encendida la lámpara de esta biblioteca.';
  }, [masReciente]);

  return (
    <section aria-labelledby="muro-gratitud" className="px-6 sm:px-10 pt-6 pb-7 border-t border-[var(--room-line)] text-center">
      <h3
        id="muro-gratitud"
        className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[var(--room-ink-soft)]"
      >
        Muro de gratitud
      </h3>
      <p className="mt-2 font-serif italic text-[17px] leading-snug text-[var(--room-ink)] max-w-md mx-auto">{frase}</p>

      {muro.length > 0 ? (
        <ul className="mt-4 flex flex-wrap justify-center gap-1.5 max-h-40 overflow-y-auto" aria-label="Personas que apoyan">
          {muro.map((entrada, i) => {
            const nuevo = isRecent(entrada);
            return (
              <motion.li
                key={entrada.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: Math.min(i, 12) * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className={`px-3 py-1 rounded-full border font-serif italic text-[15px] ${
                  nuevo
                    ? 'border-[var(--room-accent)]/50 bg-[var(--room-accent)]/10 text-[var(--room-ink)]'
                    : 'border-[var(--room-line)] text-[var(--room-ink-soft)]'
                }`}
              >
                {entrada.nombre}
                {nuevo && <span className="not-italic font-sans text-[10px] uppercase tracking-wider text-[var(--room-accent)] ml-1.5">nuevo</span>}
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--room-ink-soft)]">Tu nombre puede ser el primero en este muro.</p>
      )}
    </section>
  );
}
