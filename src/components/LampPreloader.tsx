import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { preloadEditorialAssets } from '../utils/assetPreloader';
import { BRAND_CONFIG } from '../config/brand';

export interface LampPreloaderProps {
  visible: boolean;
  /** Primera visita: lámpara + frase de un clásico. Después: solo la luz, breve. */
  fullIntro?: boolean;
  onComplete: (result: { paperTextureUrl: string | null }) => void;
}

/** Frases de obras de dominio público presentes en la biblioteca o afines. */
const CLASSIC_LINES: ReadonlyArray<{ text: string; author: string; work: string }> = [
  { text: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', author: 'Miguel de Cervantes', work: 'Don Quijote de la Mancha' },
  { text: '¿Y de qué sirve un libro sin dibujos ni diálogos?', author: 'Lewis Carroll', work: 'Alicia en el país de las maravillas' },
  { text: 'Un libro debe ser el hacha que rompa el mar helado dentro de nosotros.', author: 'Franz Kafka', work: 'Carta a Oskar Pollak' },
  { text: 'No hay libros morales o inmorales. Los libros están bien o mal escritos.', author: 'Oscar Wilde', work: 'El retrato de Dorian Gray' },
  { text: 'Declaro que, después de todo, no hay placer como el de la lectura.', author: 'Jane Austen', work: 'Orgullo y prejuicio' },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Arranca y termina despacio: la luz nunca entra de golpe. */
const EASE_SOFT: [number, number, number, number] = [0.45, 0, 0.25, 1];
/**
 * Radio final de la luz (vmax): la distancia a la esquina más lejana desde la lámpara en
 * ESTA pantalla. Así la luz termina de iluminar la sala justo al acabar la animación,
 * sin tramos invisibles ni esperas.
 */
function revealEnd(): number {
  const vmax = Math.max(window.innerWidth, window.innerHeight) / 100;
  return Math.hypot(window.innerWidth / 2, window.innerHeight - 120) / vmax + 2;
}
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Entrada de la sala: en penumbra cuelga una lámpara; se enciende, ilumina una frase
 * y luego su luz inunda la pantalla y descubre la portada. Sin cortes: la luz ES la portada.
 */
export function LampPreloader({ visible, fullIntro = true, onComplete }: LampPreloaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const line = useMemo(
    () => CLASSIC_LINES[Math.floor(Math.random() * CLASSIC_LINES.length)],
    // Una frase distinta cada vez que se muestra la entrada.
    [visible],
  );
  const [lampOn, setLampOn] = useState(false);
  const [showLine, setShowLine] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Radio del círculo de luz que "abre" la penumbra (en vmax).
  const reveal = useMotionValue(0);
  // Borde difuso proporcional: con radio 0 la penumbra es total (no asoma la portada).
  const feather = useTransform(reveal, (r) => r * 1.5);
  const mask = useMotionTemplate`radial-gradient(circle at 50% 7.5rem, transparent ${reveal}vmax, black ${feather}vmax)`;
  const veilOpacity = useMotionValue(1);
  // Lámpara, halo y botón se retiran mientras la luz llena la sala.
  const foreground = useMotionValue(1);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    reveal.set(0);
    veilOpacity.set(1);
    foreground.set(1);
    setLampOn(false);
    setShowLine(false);

    const assets = preloadEditorialAssets(() => undefined);

    const run = async () => {
      if (prefersReducedMotion) {
        setLampOn(true);
        const result = await assets;
        await wait(500);
        if (cancelled) return;
        await animate(veilOpacity, 0, { duration: 0.3 }).finished;
        if (!cancelled) onCompleteRef.current(result);
        return;
      }

      await wait(fullIntro ? 700 : 200);
      if (cancelled) return;
      setLampOn(true);

      if (fullIntro) {
        await wait(900);
        if (cancelled) return;
        setShowLine(true);
        await wait(2800);
        if (cancelled) return;
        setShowLine(false);
        await wait(900);
      } else {
        await wait(600);
      }

      const result = await assets;
      if (cancelled) return;
      // La luz se expande desde la lámpara hasta llenar la sala.
      void animate(foreground, 0, { duration: 1.8, ease: EASE_SOFT });
      await animate(reveal, revealEnd(), { duration: fullIntro ? 2.6 : 1.6, ease: EASE_SOFT }).finished;
      if (!cancelled) onCompleteRef.current(result);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [visible, fullIntro, prefersReducedMotion, reveal, veilOpacity, foreground]);

  const skip = () => {
    void animate(foreground, 0, { duration: 0.7, ease: EASE_SOFT });
    void animate(reveal, revealEnd(), { duration: 1.1, ease: EASE_SOFT }).finished.then(async () => {
      onCompleteRef.current({ paperTextureUrl: null });
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="lamp-preloader"
          role="dialog"
          aria-modal="true"
          aria-label={`Entrando a ${BRAND_CONFIG.name}`}
          data-testid="lamp-preloader"
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-50 select-none"
        >
          {/* Penumbra con el agujero de luz que crece */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[#1C1A17]"
            style={{
              opacity: veilOpacity,
              WebkitMaskImage: mask,
              maskImage: mask,
            }}
          />

          <motion.div className="absolute inset-0" style={{ opacity: foreground }}>
          {/* Halo cálido de la lámpara sobre la pared en penumbra */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[70vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: lampOn ? 1 : 0 }}
            transition={{ duration: 2, ease: EASE }}
            style={{
              background:
                'radial-gradient(ellipse 38% 55% at 50% 7.5rem, rgba(255,212,150,0.30) 0%, rgba(255,212,150,0.08) 45%, rgba(0,0,0,0) 75%)',
            }}
          />

          {/* Lámpara colgante */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[92px] sm:w-[110px]">
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 120 150"
            className="w-full h-auto overflow-visible"
            initial={{ rotate: 0 }}
            animate={{ rotate: prefersReducedMotion ? 0 : [0, 0.8, -0.5, 0] }}
            transition={{ duration: 6, ease: 'easeInOut' }}
            style={{ transformOrigin: '50% 0%' }}
          >
            <line x1="60" y1="0" x2="60" y2="78" stroke="#8C8273" strokeWidth="1.2" />
            <path d="M34 112 L46 80 H74 L86 112 Z" fill="#3B362F" />
            <path d="M34 112 L46 80 H74 L86 112 Z" fill="none" stroke="#5A5247" strokeWidth="1" />
            <motion.circle
              cx="60"
              cy="110"
              r="8"
              initial={{ fill: '#4A443B' }}
              animate={{ fill: lampOn ? '#FFDCA3' : '#4A443B' }}
              transition={{ duration: 1.4, ease: EASE }}
            />
            <motion.circle
              cx="60"
              cy="112"
              r="26"
              fill="rgba(255,214,150,0.5)"
              style={{ filter: 'blur(10px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: lampOn ? 1 : 0 }}
              transition={{ duration: 1.6, ease: EASE }}
            />
          </motion.svg>
          </div>

          {/* Frase bajo la luz */}
          <div className="absolute inset-x-0 top-[38vh] px-8 flex justify-center">
            <AnimatePresence>
              {showLine && (
                <motion.figure
                  key={line.text}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 1.3, ease: EASE } }}
                  exit={{ opacity: 0, transition: { duration: 0.9, ease: EASE_SOFT } }}
                  className="max-w-xl text-center"
                >
                  <blockquote className="font-serif italic text-[1.35rem] sm:text-3xl leading-snug text-[#EFE4CF]">
                    «{line.text}»
                  </blockquote>
                  <figcaption className="mt-4 text-[12px] sm:text-[13px] tracking-wide text-[#B8AC98]">
                    {line.author} · <span className="italic">{line.work}</span>
                  </figcaption>
                </motion.figure>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={skip}
            className="absolute bottom-6 right-6 px-3 py-1.5 text-xs text-[#B8AC98] hover:text-[#EFE4CF] rounded-full border border-[#B8AC98]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A273]"
          >
            Entrar
          </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
