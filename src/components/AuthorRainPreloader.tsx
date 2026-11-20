import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BRAND_CONFIG } from '../config/brand';
import { preloadEditorialAssets } from '../utils/assetPreloader';
import {
  PRELOADER_FADE_MS,
  PRELOADER_MAX_MS,
  PRELOADER_MIN_MS,
  buildPreloaderWriterList,
  generateAuthorRainDrops,
  rainDrift,
  rainFallEase,
  rainOpacity,
  type RainWriterDrop,
} from '../utils/authorRainPhysics';

export interface AuthorRainPreloaderProps {
  visible: boolean;
  onComplete: (result: { paperTextureUrl: string | null }) => void;
}

const TONE_COLOR_CLASS: Record<RainWriterDrop['tone'], string> = {
  ink: 'text-[#1A1917]/80',
  stone: 'text-[#5C564E]/88',
  moss: 'text-[#4A5D4E]/90',
  terracotta: 'text-[#B45335]/86',
};

function makeParchmentGrainUrl(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 520; i += 1) {
      const x = (i * 47) % size;
      const y = (i * 89 + Math.floor(i / 7) * 13) % size;
      const shade =
        i % 3 === 0
          ? 'rgba(62,42,20,0.07)'
          : i % 3 === 1
            ? 'rgba(255,244,220,0.08)'
            : 'rgba(140,96,48,0.05)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, i % 5 === 0 ? 1.6 : 1, i % 4 === 0 ? 1.6 : 1);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function progressLabel(progress: number): string {
  if (progress < 40) return 'Abriendo el archivo…';
  if (progress < 80) return 'Las voces llegan despacio…';
  return 'Biblioteca lista para leer';
}

export function AuthorRainPreloader({ visible, onComplete }: AuthorRainPreloaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [grainUrl] = useState<string | null>(() => makeParchmentGrainUrl());
  const [paperTextureUrl, setPaperTextureUrl] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const drops = useMemo(() => {
    const width = typeof window === 'undefined' ? 1440 : window.innerWidth;
    return generateAuthorRainDrops(buildPreloaderWriterList(18), width);
  }, []);

  const dropRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const barRef = useRef<HTMLDivElement | null>(null);
  const barTrackRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const percentRef = useRef<HTMLSpanElement | null>(null);
  const viewportRef = useRef({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  });
  const paperRef = useRef<string | null>(null);
  const assetsReadyRef = useRef(false);
  const exitingRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      viewportRef.current = { width: window.innerWidth, height: window.innerHeight };
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const controller = new AbortController();
    let fadeTimer: number | undefined;
    let raf = 0;
    const startedAt = performance.now();
    exitingRef.current = false;
    assetsReadyRef.current = false;
    setIsExiting(false);

    const beginExit = () => {
      if (exitingRef.current || controller.signal.aborted) return;
      exitingRef.current = true;
      setIsExiting(true);
      fadeTimer = window.setTimeout(() => {
        if (!controller.signal.aborted) {
          onCompleteRef.current({ paperTextureUrl: paperRef.current });
        }
      }, prefersReducedMotion ? 180 : PRELOADER_FADE_MS);
    };

    void preloadEditorialAssets(() => {
      // El progreso visible avanza con el tiempo, sin saltos del precargado.
    }, controller.signal).then((assets) => {
      if (controller.signal.aborted) return;
      paperRef.current = assets.paperTextureUrl;
      setPaperTextureUrl(assets.paperTextureUrl);
      assetsReadyRef.current = true;
    });

    const tick = (now: number) => {
      if (controller.signal.aborted) return;
      const elapsed = now - startedAt;
      const height = viewportRef.current.height;
      const width = viewportRef.current.width;

      if (!prefersReducedMotion) {
        const nodes = dropRefs.current;
        for (let i = 0; i < drops.length; i += 1) {
          const drop = drops[i];
          const node = nodes[i];
          if (!node) continue;
          const local = (elapsed / 1000 - drop.delaySec) / drop.durationSec;
          if (local <= 0) {
            node.style.opacity = '0';
            continue;
          }
          const t = Math.min(1, local);
          const y = -0.14 * height + rainFallEase(t) * (1.22 * height);
          const x = rainDrift(t, drop.driftPercent) * (width / 100);
          const rot =
            drop.initialRotationDeg + (drop.finalRotationDeg - drop.initialRotationDeg) * t;
          node.style.transform = `translate(-50%, 0) translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
          node.style.opacity = String(rainOpacity(t) * 0.92);
        }
      }

      const visualProgress = Math.min(100, Math.round((elapsed / PRELOADER_MIN_MS) * 100));
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${visualProgress / 100})`;
      }
      if (barTrackRef.current) {
        barTrackRef.current.setAttribute('aria-valuenow', String(visualProgress));
      }
      if (labelRef.current) {
        labelRef.current.textContent = progressLabel(visualProgress);
      }
      if (percentRef.current) {
        percentRef.current.textContent = `${visualProgress}%`;
      }

      if (
        elapsed >= PRELOADER_MIN_MS &&
        (assetsReadyRef.current || elapsed >= PRELOADER_MAX_MS)
      ) {
        beginExit();
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      controller.abort();
      if (fadeTimer !== undefined) window.clearTimeout(fadeTimer);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [visible, prefersReducedMotion, drops]);

  const handleSkip = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);
    window.setTimeout(() => {
      onComplete({ paperTextureUrl });
    }, prefersReducedMotion ? 140 : 360);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="author-rain-preloader"
          data-testid="author-rain-preloader"
          role="dialog"
          aria-modal="true"
          aria-label={`Cargando ${BRAND_CONFIG.name}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: isExiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.16 : PRELOADER_FADE_MS / 1000,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="preloader-parchment fixed inset-0 z-50 text-[#1A1917] overflow-hidden flex flex-col justify-between select-none"
        >
          {grainUrl && (
            <div
              aria-hidden="true"
              className="preloader-grain absolute inset-0 z-[1] pointer-events-none"
              style={{ backgroundImage: `url(${grainUrl})` }}
            />
          )}

          <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-6">
            <span className="text-xs font-medium tracking-wide text-[#5C564E]">
              Edición abierta · Archivo de lectura
            </span>
            <button
              type="button"
              onClick={handleSkip}
              className="px-3 py-1.5 text-xs font-medium text-[#5C564E] hover:text-[#1A1917] border border-[#C4B496]/80 bg-[#E8DCC4]/55 rounded-lg transition-colors"
            >
              Entrar ahora
            </button>
          </div>

          <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pb-10 text-center">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-lg w-full space-y-5"
            >
              <p className="text-xs font-medium tracking-widest text-[#4A5D4E]">
                Cada página abre un mundo
              </p>

              <h1 className="font-serif text-5xl sm:text-6xl font-medium tracking-tight text-[#1A1917]">
                {BRAND_CONFIG.name}
              </h1>

              <p className="text-sm text-[#5C564E]">
                {BRAND_CONFIG.tagline}
              </p>

              <div className="pt-2 space-y-2 max-w-xs mx-auto">
                <div
                  ref={barTrackRef}
                  className="h-[2px] w-full bg-[#C4B496] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label="Progreso de carga del archivo literario"
                  aria-valuenow={0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    ref={barRef}
                    className="h-full bg-[#B45335] origin-left"
                    style={{ transform: 'scaleX(0)' }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C564E] tabular-nums">
                  <span ref={labelRef} className="truncate pr-2">
                    Abriendo el archivo…
                  </span>
                  <span ref={percentRef} className="font-medium text-[#1A1917]">
                    0%
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <div
            aria-hidden="true"
            data-testid="author-rain-layer"
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          >
            {!prefersReducedMotion &&
              drops.map((drop, index) => (
                <span
                  key={drop.id}
                  ref={(node) => {
                    dropRefs.current[index] = node;
                  }}
                  style={{
                    left: `${drop.xPercent}%`,
                    top: 0,
                    fontSize: `${drop.fontSizeRem}rem`,
                    opacity: 0,
                    transform: 'translate(-50%, 0)',
                    willChange: 'transform, opacity',
                  }}
                  className={`absolute font-serif italic whitespace-nowrap tracking-tight ${TONE_COLOR_CLASS[drop.tone]}`}
                >
                  {drop.name}
                </span>
              ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
