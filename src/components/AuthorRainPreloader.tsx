import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BRAND_CONFIG } from '../config/brand';
import { preloadEditorialAssets, type PreloadStage } from '../utils/assetPreloader';
import {
  buildPreloaderWriterList,
  generateAuthorRainDrops,
  type RainWriterDrop,
} from '../utils/authorRainPhysics';

export interface AuthorRainPreloaderProps {
  visible: boolean;
  onComplete: (result: { paperTextureUrl: string | null }) => void;
}

const TONE_COLOR_CLASS: Record<RainWriterDrop['tone'], string> = {
  ink: 'text-[#1A1917]/85',
  stone: 'text-[#6B665E]',
  moss: 'text-[#4A5D4E]',
  terracotta: 'text-[#B45335]/90',
};

export function AuthorRainPreloader({ visible, onComplete }: AuthorRainPreloaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => {
    if (typeof window === 'undefined') return { width: 1440, height: 900 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  const [stage, setStage] = useState<PreloadStage>({
    progress: 0,
    label: 'Abriendo archivo literario...',
    done: false,
  });
  const [paperTextureUrl, setPaperTextureUrl] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const drops = useMemo(() => {
    const names = buildPreloaderWriterList(18);
    return generateAuthorRainDrops(names, viewportSize.width);
  }, [viewportSize.width]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    let revealTimer: number | undefined;
    let finishTimer: number | undefined;

    setIsExiting(false);
    setStage({ progress: 0, label: 'Abriendo archivo literario...', done: false });

    void preloadEditorialAssets((nextStage) => {
      setStage(nextStage);
    }, controller.signal).then((assets) => {
      if (controller.signal.aborted) return;
      setPaperTextureUrl(assets.paperTextureUrl);

      // Pausa breve para que los últimos nombres reposen suavemente antes de alzar la cortina.
      const settleMs = prefersReducedMotion ? 220 : 850;
      revealTimer = window.setTimeout(() => {
        if (controller.signal.aborted) return;
        setIsExiting(true);
        finishTimer = window.setTimeout(() => {
          if (!controller.signal.aborted) {
            onComplete(assets);
          }
        }, prefersReducedMotion ? 160 : 720);
      }, settleMs);
    });

    return () => {
      controller.abort();
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, [visible, onComplete, prefersReducedMotion]);

  const handleSkip = () => {
    setIsExiting(true);
    window.setTimeout(() => {
      onComplete({ paperTextureUrl });
    }, prefersReducedMotion ? 120 : 420);
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
          initial={{ y: '0%', opacity: 1 }}
          animate={
            isExiting
              ? { y: '-100%', opacity: 0.96 }
              : { y: '0%', opacity: 1 }
          }
          transition={{
            duration: prefersReducedMotion ? 0.18 : 0.72,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            backgroundImage: paperTextureUrl ? `url(${paperTextureUrl})` : undefined,
            backgroundRepeat: 'repeat',
          }}
          className="fixed inset-0 z-50 bg-[#FAF8F5] text-[#1A1917] overflow-hidden flex flex-col justify-between select-none"
        >
          {/* Franja superior discreta */}
          <div className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-6">
            <span className="text-xs font-medium tracking-wide text-[#6B665E]">
              Edición abierta · Archivo comunitario
            </span>
            <button
              type="button"
              onClick={handleSkip}
              className="px-3 py-1.5 text-xs font-medium text-[#6B665E] hover:text-[#1A1917] border border-[#E6DFD3] bg-[#FAF8F5]/90 rounded-lg transition-colors"
            >
              Entrar ahora
            </button>
          </div>

          {/* Ancla central despejada (sin colisión con la lluvia inferior) */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 pb-28 sm:pb-32 text-center">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-lg w-full space-y-5"
            >
              <p className="text-xs font-medium tracking-widest text-[#4A5D4E]">
                Cada página abre un mundo
              </p>

              <h1 className="font-serif text-5xl sm:text-6xl font-medium tracking-tight text-[#1A1917]">
                {BRAND_CONFIG.name}
              </h1>

              <p className="text-sm text-[#6B665E]">
                {BRAND_CONFIG.tagline}
              </p>

              {/* Indicador editorial fino de progreso real */}
              <div className="pt-2 space-y-2 max-w-xs mx-auto">
                <div
                  className="h-[2px] w-full bg-[#E6DFD3] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label="Progreso de carga del archivo literario"
                  aria-valuenow={stage.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    className="h-full bg-[#D97757]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: stage.progress / 100 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: 'left center' }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B665E] tabular-nums">
                  <span className="truncate pr-2">{stage.label}</span>
                  <span className="font-medium text-[#1A1917]">{stage.progress}%</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Capa cinética: Lluvia de Escritores y apilamiento suave al pie */}
          <div
            aria-hidden="true"
            data-testid="author-rain-layer"
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          >
            {/* Sutil gradiente de papel en el tercio inferior para sostener visualmente la pila */}
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#F3EFE8]/85 via-[#FAF8F5]/40 to-transparent" />

            {drops.map((drop) => {
              const startY = -(viewportSize.height - drop.stackBottomPx + 48);
              const targetY = 0;

              return (
                <span
                  key={drop.id}
                  style={{
                    left: `${drop.xPercent}%`,
                    bottom: `${drop.stackBottomPx}px`,
                  }}
                  className="absolute -translate-x-1/2"
                >
                  <motion.span
                    initial={
                      prefersReducedMotion
                        ? { opacity: 0.9, y: targetY, rotate: drop.finalRotationDeg }
                        : {
                            opacity: 0,
                            y: startY,
                            rotate: drop.initialRotationDeg,
                          }
                    }
                    animate={{
                      opacity: [0, 0.92, 0.9],
                      y: targetY,
                      rotate: drop.finalRotationDeg,
                    }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.2 }
                        : {
                            y: {
                              duration: drop.durationSec,
                              delay: drop.delaySec,
                              ease: [0.22, 1, 0.36, 1],
                            },
                            rotate: {
                              duration: drop.durationSec,
                              delay: drop.delaySec,
                              ease: [0.16, 1, 0.3, 1],
                            },
                            opacity: {
                              duration: 0.45,
                              delay: drop.delaySec,
                              times: [0, 0.35, 1],
                            },
                          }
                    }
                    style={{ fontSize: `${drop.fontSizeRem}rem` }}
                    className={`inline-block font-serif italic whitespace-nowrap tracking-tight ${TONE_COLOR_CLASS[drop.tone]}`}
                  >
                    {drop.name}
                  </motion.span>
                </span>
              );
            })}
          </div>

          {/* Borde inferior de papel cortado que acompaña la cortina al subir */}
          <div className="relative z-20 h-1 w-full bg-[#E6DFD3]" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
