import { getAllAuthors } from '../data/catalogEngine';

export interface RainWriterDrop {
  id: string;
  name: string;
  /** Porcentaje horizontal inicial [8..92] en escritorio */
  xPercent: number;
  /** Deriva horizontal en puntos porcentuales durante la caída */
  driftPercent: number;
  /** Rotación inicial al aparecer */
  initialRotationDeg: number;
  /** Rotación al final de la trayectoria */
  finalRotationDeg: number;
  /** Retraso de aparición en segundos */
  delaySec: number;
  /** Duración de la caída en segundos */
  durationSec: number;
  /** Tamaño tipográfico relativo en rem */
  fontSizeRem: number;
  /** Tono editorial asignado */
  tone: 'ink' | 'stone' | 'moss' | 'terracotta';
}

/**
 * Secuencia del precargador (acordada 2026-11-20):
 * 1) Los autores caen uno por uno, despacio, para poder leer cada nombre.
 * 2) Cuando el último se apaga, aparece el logo (hero) con un fundido suave.
 * 3) Tras una breve pausa, todo se disuelve hacia la estantería.
 */
export const RAIN_STAGGER_SEC = 1.0;
export const RAIN_FALL_SEC = 2.5;
export const RAIN_COUNT_DESKTOP = 5;
export const RAIN_COUNT_MOBILE = 5;
export const HERO_FADE_MS = 1100;
export const HERO_HOLD_MS = 900;

/** Fin de la lluvia en ms para un número dado de nombres. */
export function rainEndMs(count: number): number {
  return Math.round(((Math.max(1, count) - 1) * RAIN_STAGGER_SEC + RAIN_FALL_SEC) * 1000);
}

/** El logo empieza a aparecer cuando el último nombre ya casi se ha ido. */
export function heroStartMs(count: number): number {
  return rainEndMs(count) - 300;
}

/** Tiempo mínimo del precargador: lluvia + aparición del logo + pausa. */
export function preloaderMinMs(count: number): number {
  return heroStartMs(count) + HERO_FADE_MS + HERO_HOLD_MS;
}

export function rainCountFor(viewportWidth: number): number {
  return viewportWidth < 640 ? RAIN_COUNT_MOBILE : RAIN_COUNT_DESKTOP;
}

export const PRELOADER_MIN_MS = preloaderMinMs(RAIN_COUNT_DESKTOP);
export const PRELOADER_MAX_MS = PRELOADER_MIN_MS + 600;
export const PRELOADER_FADE_MS = 700;

const COMPLEMENTARY_LITERARY_VOICES = [
  'Elena Garro',
  'Roberto Bolaño',
  'Simone de Beauvoir',
  'Italo Calvino',
  'María Luisa Bombal',
  'Fernando Pessoa',
  'Franz Kafka',
  'Sylvia Plath',
  'Rosario Castellanos',
  'Octavio Paz',
];

const TONE_PALETTE: ReadonlyArray<RainWriterDrop['tone']> = [
  'ink',
  'stone',
  'moss',
  'ink',
  'terracotta',
  'stone',
];

function deterministicFraction(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Construye la lista ordenada de nombres literarios combinando los autores
 * reales del catálogo con voces clásicas universales, sin duplicados.
 */
export function buildPreloaderWriterList(maxCount = 18): string[] {
  const catalogAuthors = getAllAuthors().map((a) => a.name);
  const seen = new Set<string>();
  const combined: string[] = [];

  for (const name of [...catalogAuthors, ...COMPLEMENTARY_LITERARY_VOICES]) {
    const trimmed = name.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    combined.push(trimmed);
    if (combined.length >= maxCount) break;
  }

  return combined;
}

/** Caída serena: avanza desde el inicio y acelera apenas, para poder leer. */
export function rainFallEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 0.6 * x + 0.4 * x * x;
}

/** Aparece despacio, se sostiene legible y se desvanece al final. */
export function rainOpacity(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  if (x < 0.16) return x / 0.16;
  if (x > 0.72) return Math.max(0, 1 - (x - 0.72) / 0.28);
  return 1;
}

/** Merma lateral en arco, nula al inicio y al final. */
export function rainDrift(t: number, amplitude: number): number {
  const x = Math.min(1, Math.max(0, t));
  return amplitude * Math.sin(x * Math.PI);
}

/**
 * Lluvia de autores uno por uno: cada nombre cae solo, en un carril alejado
 * del anterior, grande y despacio para leerse. Nunca se apilan.
 */
export function generateAuthorRainDrops(
  names: readonly string[],
  viewportWidth = 1440,
): RainWriterDrop[] {
  const isCompact = viewportWidth < 640;
  const visibleCount = Math.min(names.length, rainCountFor(viewportWidth));
  // Carriles alternados: cada nombre cae lejos del anterior.
  const lanes = isCompact ? [38, 62, 44, 58, 50] : [26, 68, 38, 76, 32, 60];

  const drops: RainWriterDrop[] = [];

  for (let i = 0; i < visibleCount; i += 1) {
    const jitter = (deterministicFraction(i + 1) - 0.5) * (isCompact ? 4 : 6);
    const xPercent = Number((lanes[i % lanes.length] + jitter).toFixed(2));
    const driftPercent = Number(
      ((deterministicFraction(i + 23) - 0.5) * (isCompact ? 3 : 5)).toFixed(2),
    );
    const finalRotationDeg = Number(
      ((deterministicFraction(i + 17) - 0.5) * (isCompact ? 5 : 7)).toFixed(2),
    );
    const initialRotationDeg = Number((finalRotationDeg * 0.4).toFixed(2));
    const delaySec = Number((i * RAIN_STAGGER_SEC).toFixed(3));
    const durationSec = RAIN_FALL_SEC;
    const baseSize = isCompact ? 1.3 : 1.75;
    const sizeVariation = (deterministicFraction(i + 41) - 0.5) * (isCompact ? 0.12 : 0.2);
    const fontSizeRem = Number((baseSize + sizeVariation).toFixed(3));

    drops.push({
      id: `writer-drop-${i}`,
      name: names[i],
      xPercent,
      driftPercent,
      initialRotationDeg,
      finalRotationDeg,
      delaySec,
      durationSec,
      fontSizeRem,
      tone: TONE_PALETTE[i % TONE_PALETTE.length],
    });
  }

  return drops;
}
