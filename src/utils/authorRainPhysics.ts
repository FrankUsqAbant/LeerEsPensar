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

export const PRELOADER_MIN_MS = 2000;
export const PRELOADER_MAX_MS = 2500;
export const PRELOADER_FADE_MS = 560;

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

/** Gravedad suave: arranca despacio y acelera. t se recorta a [0, 1]. */
export function rainFallEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x;
}

/** Aparece en el primer tramo, se sostiene y se desvanece al final. */
export function rainOpacity(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  if (x < 0.14) return x / 0.14;
  if (x > 0.7) return Math.max(0, 1 - (x - 0.7) / 0.3);
  return 1;
}

/** Merma lateral en arco, nula al inicio y al final. */
export function rainDrift(t: number, amplitude: number): number {
  const x = Math.min(1, Math.max(0, t));
  return amplitude * Math.sin(x * Math.PI);
}

/**
 * Calcula una lluvia ligera y espaciada, con deriva y rotación suaves.
 * No apila nombres al pie: atraviesan la pantalla y se desvanecen.
 */
export function generateAuthorRainDrops(
  names: readonly string[],
  viewportWidth = 1440,
): RainWriterDrop[] {
  const isCompact = viewportWidth < 640;
  const visibleCount = isCompact ? Math.min(names.length, 6) : Math.min(names.length, 12);
  const columns = isCompact ? 3 : 6;
  const minX = isCompact ? 18 : 10;
  const maxX = isCompact ? 82 : 90;
  const laneWidth = (maxX - minX) / Math.max(1, columns - 1);

  const drops: RainWriterDrop[] = [];

  for (let i = 0; i < visibleCount; i += 1) {
    const name = names[i];
    const wave = Math.floor(i / columns);
    const colIndex = i % columns;
    const staggeredCol = wave % 2 === 1 ? columns - 1 - colIndex : colIndex;
    const jitterRatio = (deterministicFraction(i + 1) - 0.5) * (isCompact ? 0.18 : 0.36);
    const xCenter = minX + staggeredCol * laneWidth + jitterRatio * laneWidth;
    const xPercent = Math.max(minX, Math.min(maxX, Number(xCenter.toFixed(2))));

    const driftPercent = Number(
      ((deterministicFraction(i + 23) - 0.5) * (isCompact ? 6 : 9)).toFixed(2),
    );
    const finalRotationDeg = Number(
      ((deterministicFraction(i + 17) - 0.5) * (isCompact ? 10 : 14)).toFixed(2),
    );
    const initialRotationDeg = Number(
      (finalRotationDeg * 0.35 + (deterministicFraction(i + 53) > 0.5 ? 5 : -5)).toFixed(2),
    );

    const delaySec = Number(
      ((i / Math.max(1, visibleCount - 1)) * 0.46 + deterministicFraction(i + 7) * 0.05).toFixed(3),
    );
    const durationSec = Number((1.08 + deterministicFraction(i + 19) * 0.28).toFixed(3));

    const baseSize = isCompact ? 0.92 : 1.12;
    const sizeVariation = (deterministicFraction(i + 41) - 0.5) * (isCompact ? 0.14 : 0.22);
    const fontSizeRem = Number((baseSize + sizeVariation).toFixed(3));

    drops.push({
      id: `writer-drop-${i}`,
      name,
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
