import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';

/** Libros extra que se dibujan a cada lado de lo visible (para que nunca aparezca un hueco). */
const BUFFER = 6;
/** Velocidad máxima al mantener presionada una flecha (px por segundo). */
const GLIDE_MAX_SPEED = 950;
/** Tiempo para alcanzar esa velocidad (ms): arranque suave. */
const GLIDE_RAMP_MS = 450;
/** Pulsación más larga que esto = deslizamiento continuo; más corta = un paso. */
const HOLD_DELAY_MS = 220;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface ShelfWindow {
  start: number;
  end: number;
  /** Ancho de un libro + separación (px). 0 hasta medirlo. */
  span: number;
  /** Separación entre libros (px). */
  gap: number;
}

/**
 * Desplazamiento de una repisa: suave, continuo al mantener las flechas, arrastrable con el
 * mouse (con inercia) y "virtual": solo se dibujan los libros que están a la vista.
 */
export function useShelfScroller(
  trackRef: RefObject<HTMLDivElement | null>,
  itemCount: number,
  prefersReducedMotion: boolean | null,
) {
  const [win, setWin] = useState<ShelfWindow>({ start: 0, end: Math.min(itemCount, 16), span: 0, gap: 0 });
  const animRef = useRef(0);
  const holdTimerRef = useRef<number | undefined>(undefined);
  const glidingRef = useRef(false);
  const dragRef = useRef<{ x: number; left: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const suppressClickRef = useRef(false);

  const stopAnimation = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = 0;
  }, []);

  /** Mide un libro real (ancho + separación) para calcular qué libros están a la vista. */
  const measureSpan = useCallback((track: HTMLDivElement): { span: number; gap: number } => {
    const item = track.querySelector<HTMLElement>(':scope > [data-shelf-item]');
    if (!item) return { span: 0, gap: 0 };
    const gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
    return { span: item.getBoundingClientRect().width + gap, gap };
  }, []);

  const updateWindow = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const measured = measureSpan(track);
    const span = measured.span || win.span;
    const gap = measured.span ? measured.gap : win.gap;
    if (!span) return;
    const first = Math.floor(track.scrollLeft / span);
    const visible = Math.ceil(track.clientWidth / span);
    const start = Math.max(0, first - BUFFER);
    const end = Math.min(itemCount, first + visible + BUFFER);
    setWin((prev) =>
      prev.start === start && prev.end === end && prev.span === span && prev.gap === gap
        ? prev
        : { start, end, span, gap },
    );
  }, [itemCount, measureSpan, trackRef, win.span, win.gap]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        updateWindow();
      });
    };
    updateWindow();
    track.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateWindow) : undefined;
    observer?.observe(track);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [trackRef, updateWindow]);

  useEffect(() => () => {
    stopAnimation();
    window.clearTimeout(holdTimerRef.current);
  }, [stopAnimation]);

  /** Un paso suave (~65 % del ancho visible), con aceleración y frenado. */
  const step = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track) return;
      stopAnimation();
      const max = track.scrollWidth - track.clientWidth;
      const from = track.scrollLeft;
      const to = Math.max(0, Math.min(max, from + direction * Math.max(220, track.clientWidth * 0.65)));
      if (prefersReducedMotion) {
        track.scrollLeft = to;
        return;
      }
      const duration = 650;
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        track.scrollLeft = from + (to - from) * easeInOutCubic(t);
        animRef.current = t < 1 ? requestAnimationFrame(frame) : 0;
      };
      animRef.current = requestAnimationFrame(frame);
    },
    [prefersReducedMotion, stopAnimation, trackRef],
  );

  /** Deslizamiento continuo mientras se mantiene la flecha; al soltar frena suave. */
  const startGlide = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track) return;
      stopAnimation();
      glidingRef.current = true;
      const t0 = performance.now();
      let last = t0;
      let speed = 0;
      const frame = (now: number) => {
        const dt = Math.min(48, now - last) / 1000;
        last = now;
        if (glidingRef.current) {
          speed = GLIDE_MAX_SPEED * easeInOutCubic(Math.min(1, (now - t0) / GLIDE_RAMP_MS));
        } else {
          speed *= 0.86; // frenado suave al soltar
        }
        track.scrollLeft += direction * speed * dt;
        const atEdge = direction > 0
          ? track.scrollLeft >= track.scrollWidth - track.clientWidth - 1
          : track.scrollLeft <= 0;
        // Mientras se mantiene presionada sigue (aunque al inicio la velocidad sea ~0);
        // al soltar, continúa solo hasta que el frenado la lleva casi a cero.
        const keepGoing = (glidingRef.current || speed > 8) && !atEdge;
        animRef.current = keepGoing ? requestAnimationFrame(frame) : 0;
      };
      animRef.current = requestAnimationFrame(frame);
    },
    [stopAnimation, trackRef],
  );

  /** Props para cada flecha: clic = paso suave; mantener = deslizamiento continuo. */
  const arrowProps = useCallback(
    (direction: -1 | 1) => ({
      onPointerDown: (e: ReactPointerEvent) => {
        if (e.button !== 0 || prefersReducedMotion) return;
        window.clearTimeout(holdTimerRef.current);
        glidingRef.current = false;
        holdTimerRef.current = window.setTimeout(() => startGlide(direction), HOLD_DELAY_MS);
      },
      onPointerUp: () => {
        window.clearTimeout(holdTimerRef.current);
        if (glidingRef.current) {
          glidingRef.current = false; // el frame siguiente empieza a frenar
          suppressClickRef.current = true;
        }
      },
      onPointerLeave: () => {
        window.clearTimeout(holdTimerRef.current);
        glidingRef.current = false;
      },
      onClick: () => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        step(direction);
      },
    }),
    [prefersReducedMotion, startGlide, step],
  );

  /** Arrastrar con el mouse (en táctil el navegador ya lo hace) con inercia al soltar. */
  const trackProps = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      stopAnimation();
      const track = e.currentTarget;
      dragRef.current = { x: e.clientX, left: track.scrollLeft, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = 'grabbing';
      }
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.v = 0.8 * ((e.clientX - drag.lastX) / dt) + 0.2 * drag.v; // px/ms, suavizado
      drag.lastX = e.clientX;
      drag.lastT = now;
      e.currentTarget.scrollLeft = drag.left - dx;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag?.moved) return;
      const track = e.currentTarget;
      track.style.cursor = '';
      suppressClickRef.current = true; // el arrastre no abre un libro
      if (prefersReducedMotion) return;
      let v = -drag.v * 1000; // px/s en sentido de scroll
      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(48, now - last) / 1000;
        last = now;
        track.scrollLeft += v * dt;
        v *= Math.pow(0.05, dt); // inercia que se apaga en ~1 s
        animRef.current = Math.abs(v) > 12 ? requestAnimationFrame(frame) : 0;
      };
      animRef.current = requestAnimationFrame(frame);
    },
    onPointerCancel: () => {
      dragRef.current = null;
    },
    onClickCapture: (e: ReactMouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onWheel: () => stopAnimation(),
  };

  const resetToStart = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    stopAnimation();
    track.scrollLeft = 0;
    updateWindow();
  }, [stopAnimation, trackRef, updateWindow]);

  return { win, arrowProps, trackProps, resetToStart };
}
