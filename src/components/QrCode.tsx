import { useMemo } from 'react';
import { generateQrMatrix } from '../utils/supportQrMatrix';

export interface QrCodeProps {
  value: string;
  label: string;
  className?: string;
}

/**
 * QR nítido en SVG con los colores de la sala. Mantiene el margen blanco que
 * necesitan los lectores de QR (también en modo noche).
 */
export function QrCode({ value, label, className = '' }: QrCodeProps) {
  const matrix = useMemo(() => generateQrMatrix(value), [value]);
  const size = matrix.length;
  const quiet = 3;
  const total = size + quiet * 2;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={`block ${className}`}
    >
      <rect width={total} height={total} fill="#FBF8F2" rx="1.5" />
      <path
        fill="#2B2A26"
        d={matrix
          .flatMap((row, y) =>
            row.map((dark, x) => (dark ? `M${x + quiet} ${y + quiet}h1v1h-1z` : '')),
          )
          .join('')}
      />
    </svg>
  );
}
