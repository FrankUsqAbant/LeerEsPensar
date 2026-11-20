import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import {
  ambientForHour,
  applyRoomLight,
  initialTheme,
  saveTheme,
  type RoomTheme,
} from '../utils/roomLight';

type DocumentWithTransition = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

/**
 * Lámpara colgante de la cabecera. Tirar de la cadenita apaga o enciende la sala:
 * la luz se expande desde la bombilla o se recoge hacia ella (View Transitions).
 */
export function LampSwitch() {
  const prefersReducedMotion = useReducedMotion();
  const [theme, setTheme] = useState<RoomTheme>(() => initialTheme());
  const bulbRef = useRef<SVGCircleElement | null>(null);
  const chain = useAnimationControls();

  // La hora matiza la luz; se revisa cada 10 minutos por si cambia la tarde.
  useEffect(() => {
    applyRoomLight(theme);
    const id = window.setInterval(() => {
      applyRoomLight(theme, ambientForHour(new Date().getHours()));
    }, 10 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [theme]);

  const toggle = useCallback(() => {
    const next: RoomTheme = theme === 'light' ? 'dark' : 'light';
    saveTheme(next);
    void chain.start({
      y: [0, 7, 0],
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    });

    const doc = document as DocumentWithTransition;
    const root = document.documentElement;
    const bulb = bulbRef.current?.getBoundingClientRect();
    if (bulb) {
      root.style.setProperty('--lamp-x', `${bulb.left + bulb.width / 2}px`);
      root.style.setProperty('--lamp-y', `${bulb.top + bulb.height / 2}px`);
    }

    if (!doc.startViewTransition || prefersReducedMotion) {
      setTheme(next);
      applyRoomLight(next);
      return;
    }

    const directionClass = next === 'light' ? 'lamp-turning-on' : 'lamp-turning-off';
    root.classList.add(directionClass);
    const transition = doc.startViewTransition(() => {
      flushSync(() => setTheme(next));
      applyRoomLight(next);
    });
    void transition.finished.finally(() => root.classList.remove(directionClass));
  }, [chain, prefersReducedMotion, theme]);

  const isOn = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!isOn}
      aria-label={isOn ? 'Apagar la lámpara (modo noche)' : 'Encender la lámpara (modo día)'}
      title={isOn ? 'Apagar la lámpara' : 'Encender la lámpara'}
      data-testid="lamp-switch"
      className="group relative -my-2 h-14 sm:h-16 w-10 flex items-start justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--room-accent)]"
    >
      <svg
        viewBox="0 0 40 64"
        className="h-full w-auto overflow-visible"
        aria-hidden="true"
      >
        {/* Cable del techo */}
        <line x1="20" y1="0" x2="20" y2="20" stroke="var(--room-ink-soft)" strokeWidth="1.2" />
        {/* Halo de luz (solo encendida) */}
        <circle
          cx="20"
          cy="33"
          r="14"
          fill="rgba(255, 214, 150, 0.45)"
          style={{
            opacity: isOn ? 1 : 0,
            filter: 'blur(6px)',
            transition: 'opacity 600ms ease',
          }}
        />
        {/* Pantalla de la lámpara */}
        <path
          d="M11 31 L15.5 20 H24.5 L29 31 Z"
          fill="var(--room-ink)"
          opacity="0.88"
        />
        {/* Bombilla */}
        <circle
          ref={bulbRef}
          cx="20"
          cy="32.5"
          r="3.6"
          fill={isOn ? '#FFD99E' : '#6E675C'}
          style={{ transition: 'fill 500ms ease' }}
        />
        {/* Cadenita: se balancea al pasar el cursor y baja al tirar */}
        <motion.g
          animate={chain}
          className="origin-[25px_28px] transition-transform duration-500 ease-out group-hover:rotate-[6deg]"
        >
          <line
            x1="25"
            y1="28"
            x2="25"
            y2="46"
            stroke="var(--room-ink-soft)"
            strokeWidth="0.9"
            strokeDasharray="1.4 1.2"
          />
          <circle cx="25" cy="47.5" r="1.8" fill="var(--room-accent)" />
        </motion.g>
      </svg>
    </button>
  );
}
