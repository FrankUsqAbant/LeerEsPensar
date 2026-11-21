import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

export interface GenreRibbonProps<T extends string> {
  items: readonly T[];
  active: T;
  onSelect: (item: T) => void;
}

/** Píxeles por segundo: lento, para que se pueda leer mientras pasa. */
const SPEED_PX_PER_SEC = 22;
/** Tras tocar o arrastrar, espera esto antes de volver a moverse sola. */
const RESUME_AFTER_MS = 2500;

/**
 * Cinta de géneros en una sola fila que se desliza sola y en bucle.
 * Se detiene al pasar el cursor, al tocarla o al recorrerla con el teclado,
 * y se puede arrastrar. Con "reducir movimiento" queda quieta y desplazable.
 */
export function GenreRibbon<T extends string>({ items, active, onSelect }: GenreRibbonProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const resumeAtRef = useRef(0);
  // Solo hay bucle (y copia) cuando los géneros no caben; si caben, la fila queda quieta y centrada.
  const [overflow, setOverflow] = useState(false);
  const copiesRef = useRef(1);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const single = track.scrollWidth / copiesRef.current;
      setOverflow(single > track.clientWidth + 1);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    observer?.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion || !overflow) return;

    let raf = 0;
    let last = performance.now();
    let carry = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const half = track.scrollWidth / 2;
      if (!pausedRef.current && now >= resumeAtRef.current && half > track.clientWidth) {
        carry += (SPEED_PX_PER_SEC * dt) / 1000;
        const step = Math.floor(carry);
        if (step > 0) {
          carry -= step;
          track.scrollLeft += step;
        }
        // Bucle sin salto: la segunda mitad es copia de la primera.
        if (track.scrollLeft >= half) track.scrollLeft -= half;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion, items.length, overflow]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resumeLater = () => {
    pausedRef.current = false;
    resumeAtRef.current = performance.now() + RESUME_AFTER_MS;
  };

  // Con movimiento: la lista va duplicada para el bucle (la copia no se lee ni se enfoca).
  const loops = prefersReducedMotion || !overflow ? [items] : [items, items];
  copiesRef.current = loops.length;

  return (
    <div
      role="group"
      aria-label="Filtrar por género"
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={resumeLater}
      onFocus={pause}
      onBlur={resumeLater}
      onPointerDown={pause}
      onPointerUp={resumeLater}
      onPointerCancel={resumeLater}
    >
      <div
        ref={trackRef}
        onWheel={() => {
          resumeAtRef.current = performance.now() + RESUME_AFTER_MS;
        }}
        className={`flex gap-1.5 overflow-x-auto no-scrollbar py-1 ${
          overflow ? '[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]' : 'justify-center'
        }`}
      >
        {loops.map((list, copy) =>
          list.map((item) => {
            const isActive = active === item;
            return (
              <button
                key={`${copy}-${item}`}
                type="button"
                aria-pressed={isActive}
                aria-hidden={copy === 1 ? true : undefined}
                tabIndex={copy === 1 ? -1 : undefined}
                onClick={() => onSelect(item)}
                className={`shrink-0 px-3.5 py-1 rounded-full text-[12.5px] border whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[var(--room-ink)] text-[var(--room-page)] border-transparent'
                    : 'border-[var(--room-line)] text-[var(--room-ink-soft)] hover:text-[var(--room-ink)] hover:bg-[var(--room-field)]/70'
                }`}
              >
                {item}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
