import { getAllAuthors } from '../data/catalogEngine';

export interface RainWriterDrop {
  id: string;
  name: string;
  /** Porcentaje horizontal [6..94] para evitar cortes en los bordes */
  xPercent: number;
  /** Profundidad desde la parte inferior en px donde reposa apilado */
  stackBottomPx: number;
  /** Rotación final suave en grados [-7..7] */
  finalRotationDeg: number;
  /** Rotación inicial al entrar desde arriba */
  initialRotationDeg: number;
  /** Retraso de caída en segundos */
  delaySec: number;
  /** Duración orgánica de caída en segundos */
  durationSec: number;
  /** Tamaño tipográfico relativo en rem */
  fontSizeRem: number;
  /** Tono editorial asignado */
  tone: 'ink' | 'stone' | 'moss' | 'terracotta';
  /** Estrato vertical de apilamiento (0 = suelo, 1 = medio, 2 = superior) */
  layer: number;
}

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

/**
 * Calcula trayectorias orgánicas y posiciones de apilamiento limpio en la parte
 * inferior de la pantalla sin superposiciones agresivas ni saturación visual.
 */
export function generateAuthorRainDrops(
  names: readonly string[],
  viewportWidth = 1440,
): RainWriterDrop[] {
  const isCompact = viewportWidth < 640;
  const visibleCount = isCompact ? Math.min(names.length, 8) : Math.min(names.length, 18);
  const columns = isCompact ? 2 : 6;
  const minX = isCompact ? 24 : 9;
  const maxX = isCompact ? 76 : 91;
  const laneWidth = (maxX - minX) / Math.max(1, columns - 1);

  const drops: RainWriterDrop[] = [];

  for (let i = 0; i < visibleCount; i += 1) {
    const name = names[i];
    const layer = Math.floor(i / columns);
    const colIndex = i % columns;

    // Alternar dirección entre filas para que el apilamiento parezca orgánico
    const staggeredCol = layer % 2 === 1 ? columns - 1 - colIndex : colIndex;
    const jitterRatio = (deterministicFraction(i + 1) - 0.5) * (isCompact ? 0.22 : 0.42);
    const xCenter = minX + staggeredCol * laneWidth + jitterRatio * laneWidth;
    const xPercent = Math.max(isCompact ? 20 : 8, Math.min(isCompact ? 80 : 92, Number(xCenter.toFixed(2))));

    // Altura de apilamiento desde abajo sin invadir el centro
    const baseHeight = isCompact ? 18 : 22;
    const rowStep = isCompact ? 34 : 42;
    const verticalJitter = Math.round((deterministicFraction(i + 31) - 0.5) * 6);
    const stackBottomPx = baseHeight + layer * rowStep + verticalJitter;

    const finalRotationDeg = Number(
      ((deterministicFraction(i + 17) - 0.5) * (isCompact ? 7 : 11)).toFixed(2),
    );
    const initialRotationDeg = Number(
      (finalRotationDeg + (deterministicFraction(i + 53) > 0.5 ? 10 : -10)).toFixed(2),
    );

    const delaySec = Number((i * 0.085 + deterministicFraction(i + 7) * 0.06).toFixed(3));
    const durationSec = Number(
      (1.15 + deterministicFraction(i + 19) * 0.45).toFixed(3),
    );

    const baseSize = isCompact ? 0.86 : 1.06;
    const sizeVariation = (deterministicFraction(i + 41) - 0.5) * (isCompact ? 0.12 : 0.2);
    const fontSizeRem = Number((baseSize + sizeVariation).toFixed(3));

    drops.push({
      id: `writer-drop-${i}`,
      name,
      xPercent,
      stackBottomPx,
      finalRotationDeg,
      initialRotationDeg,
      delaySec,
      durationSec,
      fontSizeRem,
      tone: TONE_PALETTE[i % TONE_PALETTE.length],
      layer,
    });
  }

  return drops;
}
