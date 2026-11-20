/**
 * Generador QR determinista en TypeScript puro (Modo Byte, EC Level L, Versiones 1-4)
 * con polinomios Reed-Solomon reales en GF(256) para renderizado SVG sin red externa.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildGeneratorPoly(ecCount: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i += 1) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomonEc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = buildGeneratorPoly(ecCount);
  const work = new Uint8Array(data.length + ecCount);
  work.set(data, 0);

  for (let i = 0; i < data.length; i += 1) {
    const coef = work[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        work[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return work.slice(data.length);
}

interface QrVersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewords: number;
  alignmentCenters: number[];
}

// Parámetros oficiales ISO/IEC 18004 para Error Correction Level L (1 bloque)
const VERSION_SPECS: QrVersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 19, ecCodewords: 7, alignmentCenters: [] },
  { version: 2, size: 25, dataCodewords: 34, ecCodewords: 10, alignmentCenters: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecCodewords: 15, alignmentCenters: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecCodewords: 20, alignmentCenters: [6, 26] },
];

function selectVersion(byteLength: number): QrVersionSpec {
  for (const spec of VERSION_SPECS) {
    // 4 bits modo (0100) + 8 bits longitud + payload + 4 bits terminador <= dataCodewords * 8
    const maxBytes = spec.dataCodewords - 2;
    if (byteLength <= maxBytes) {
      return spec;
    }
  }
  return VERSION_SPECS[VERSION_SPECS.length - 1];
}

function encodeDataCodewords(payloadBytes: Uint8Array, spec: QrVersionSpec): Uint8Array {
  const maxBytes = spec.dataCodewords - 2;
  const trimmed = payloadBytes.slice(0, maxBytes);
  const bits: number[] = [];

  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((val >> i) & 1);
    }
  };

  // Modo Byte (0100) + longitud en 8 bits
  pushBits(0b0100, 4);
  pushBits(trimmed.length, 8);
  for (const b of trimmed) {
    pushBits(b, 8);
  }
  // Terminador hasta 4 ceros
  const totalDataBits = spec.dataCodewords * 8;
  const terminatorLen = Math.min(4, totalDataBits - bits.length);
  pushBits(0, terminatorLen);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(spec.dataCodewords);
  let idx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j += 1) {
      val = (val << 1) | (bits[i + j] ?? 0);
    }
    codewords[idx] = val;
    idx += 1;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (idx < spec.dataCodewords) {
    codewords[idx] = padBytes[padIdx % 2];
    idx += 1;
    padIdx += 1;
  }

  return codewords;
}

function placeFinderPattern(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  row: number,
  col: number,
): void {
  const size = modules.length;
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[rr][cc] = inOuter && (isBorder || isCore);
      reserved[rr][cc] = true;
    }
  }
}

function placeAlignmentPattern(
  modules: (boolean | null)[][],
  reserved: boolean[][],
  centerRow: number,
  centerCol: number,
): void {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const rr = centerRow + r;
      const cc = centerCol + c;
      if (reserved[rr][cc]) return;
    }
  }
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const rr = centerRow + r;
      const cc = centerCol + c;
      const isDark =
        Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
      modules[rr][cc] = isDark;
      reserved[rr][cc] = true;
    }
  }
}

// Formato precalculado con BCH(15,5) + máscara 101010000010010 para EC Level L (01) y Mask 0 (000) -> 0x77c4
const FORMAT_BITS_L_MASK0 = 0x77c4;

function placeFormatInfo(modules: boolean[][], reserved: boolean[][]): void {
  const size = modules.length;
  for (let i = 0; i < 15; i += 1) {
    const bit = ((FORMAT_BITS_L_MASK0 >> i) & 1) === 1;
    // Copia 1 alrededor de esquina superior izquierda
    if (i < 6) {
      modules[i][8] = bit;
      reserved[i][8] = true;
    } else if (i < 8) {
      modules[i + 1][8] = bit;
      reserved[i + 1][8] = true;
    } else {
      modules[size - 15 + i][8] = bit;
      reserved[size - 15 + i][8] = true;
    }

    if (i < 8) {
      modules[8][size - i - 1] = bit;
      reserved[8][size - i - 1] = true;
    } else if (i < 9) {
      modules[8][15 - i] = bit;
      reserved[8][15 - i] = true;
    } else {
      modules[8][15 - i - 1] = bit;
      reserved[8][15 - i - 1] = true;
    }
  }
  // Dark module fijo
  modules[size - 8][8] = true;
  reserved[size - 8][8] = true;
}

export function generateQrMatrix(payload: string): boolean[][] {
  const rawBytes = new TextEncoder().encode(payload.trim() || 'LeerEsPensar');
  const spec = selectVersion(rawBytes.length);
  const dataCodewords = encodeDataCodewords(rawBytes, spec);
  const ecCodewords = computeReedSolomonEc(dataCodewords, spec.ecCodewords);

  const fullCodewords = new Uint8Array(dataCodewords.length + ecCodewords.length);
  fullCodewords.set(dataCodewords, 0);
  fullCodewords.set(ecCodewords, dataCodewords.length);

  const bitStream: boolean[] = [];
  for (const byte of fullCodewords) {
    for (let b = 7; b >= 0; b -= 1) {
      bitStream.push(((byte >> b) & 1) === 1);
    }
  }

  const size = spec.size;
  const modules: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array<boolean | null>(size).fill(null),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false),
  );

  // Patrones de búsqueda (3 esquinas)
  placeFinderPattern(modules, reserved, 0, 0);
  placeFinderPattern(modules, reserved, 0, size - 7);
  placeFinderPattern(modules, reserved, size - 7, 0);

  // Patrones de alineamiento
  for (const r of spec.alignmentCenters) {
    for (const c of spec.alignmentCenters) {
      placeAlignmentPattern(modules, reserved, r, c);
    }
  }

  // Patrones de sincronización (timing)
  for (let i = 8; i < size - 8; i += 1) {
    const isDark = i % 2 === 0;
    if (!reserved[6][i]) {
      modules[6][i] = isDark;
      reserved[6][i] = true;
    }
    if (!reserved[i][6]) {
      modules[i][6] = isDark;
      reserved[i][6] = true;
    }
  }

  // Reservar espacio de formato antes de trazar datos
  const dummyGrid = modules.map((row) => row.map((cell) => cell ?? false));
  placeFormatInfo(dummyGrid, reserved);

  // Trazado en zigzag de derecha a izquierda aplicando máscara 0 ((row + col) % 2 === 0)
  let bitIdx = 0;
  let goingUp = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1; // Saltar columna de sincronización
    for (let step = 0; step < size; step += 1) {
      const row = goingUp ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const c = col - offset;
        if (!reserved[row][c]) {
          const dataBit = bitIdx < bitStream.length ? bitStream[bitIdx] : false;
          bitIdx += 1;
          const maskBit = (row + c) % 2 === 0;
          modules[row][c] = dataBit !== maskBit;
        }
      }
    }
    goingUp = !goingUp;
  }

  const finalGrid = modules.map((row) => row.map((cell) => Boolean(cell)));
  placeFormatInfo(finalGrid, reserved);
  return finalGrid;
}
