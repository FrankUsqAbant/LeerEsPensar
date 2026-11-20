import { useId } from 'react';

interface BotanicalBranchProps {
  side: 'left' | 'right';
  variant?: 'olive-bracket' | 'eucalyptus-drape';
  className?: string;
}

/**
 * Ilustración botánica fina en tonos salvia y musgo (#4A5D4E / #6E826D):
 * ramas naturales de olivo y eucalipto que nacen en los soportes laterales de madera,
 * abrazan la ménsula y dejan caer hojas sobre el canto de la repisa con sombra proyectada,
 * manteniendo despejado el frente de los libros.
 */
export function BotanicalBranchSvg({
  side,
  variant = 'olive-bracket',
  className = '',
}: BotanicalBranchProps) {
  const filterId = useId();
  const flipX = side === 'right' ? 'scale(-1, 1)' : undefined;

  if (variant === 'eucalyptus-drape') {
    return (
      <svg
        viewBox="0 0 220 160"
        fill="none"
        aria-hidden="true"
        className={className}
        style={flipX ? { transform: flipX } : undefined}
      >
        <defs>
          <filter id={filterId} x="-15%" y="-15%" width="135%" height="145%">
            <feDropShadow
              dx="2"
              dy="4"
              stdDeviation="2.4"
              floodColor="#2A2014"
              floodOpacity="0.22"
            />
          </filter>
        </defs>

        <g filter={`url(#${filterId})`}>
          {/* Tallo leñoso que nace junto al lateral de la repisa y abraza el soporte */}
          <path
            d="M10 38 C 22 60, 28 84, 48 94 C 78 108, 128 102, 186 112"
            stroke="#5D5342"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M34 86 C 48 112, 62 132, 94 146"
            stroke="#675D4B"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M96 102 C 122 118, 148 130, 178 128"
            stroke="#6E826D"
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          {/* Follaje lateral fuera del área de lectura de los libros */}
          <path
            d="M16 48 C 2 38, 4 20, 18 14 C 30 24, 28 40, 16 48 Z"
            fill="#4A5D4E"
            fillOpacity="0.94"
          />
          <path d="M16 44 L 18 19" stroke="#EAE4D8" strokeOpacity="0.4" strokeWidth="0.85" />

          <path
            d="M28 74 C 12 72, 6 56, 16 46 C 30 50, 36 62, 28 74 Z"
            fill="#6E826D"
            fillOpacity="0.92"
          />
          <path d="M26 70 L 18 50" stroke="#FAF7F2" strokeOpacity="0.4" strokeWidth="0.8" />

          {/* Hojas tendidas sobre el canto de la madera y cayendo bajo la repisa */}
          <path
            d="M66 98 C 68 82, 86 76, 98 84 C 92 98, 78 102, 66 98 Z"
            fill="#566B58"
            fillOpacity="0.94"
          />
          <path d="M70 96 L 94 86" stroke="#FAF7F2" strokeOpacity="0.38" strokeWidth="0.8" />

          <path
            d="M114 104 C 122 88, 142 86, 154 96 C 142 108, 128 110, 114 104 Z"
            fill="#6E826D"
            fillOpacity="0.9"
          />
          <path d="M118 103 L 148 97" stroke="#FAF7F2" strokeOpacity="0.35" strokeWidth="0.75" />

          <path
            d="M164 111 C 174 98, 192 98, 202 108 C 190 118, 176 118, 164 111 Z"
            fill="#4A5D4E"
            fillOpacity="0.9"
          />

          <path
            d="M44 104 C 26 108, 22 126, 36 136 C 50 130, 54 116, 44 104 Z"
            fill="#5D7260"
            fillOpacity="0.92"
          />
          <path d="M43 108 L 36 131" stroke="#FAF7F2" strokeOpacity="0.35" strokeWidth="0.8" />

          <path
            d="M74 128 C 62 138, 66 154, 82 156 C 92 146, 88 132, 74 128 Z"
            fill="#4A5D4E"
            fillOpacity="0.94"
          />
          <path d="M75 132 L 81 151" stroke="#FAF7F2" strokeOpacity="0.35" strokeWidth="0.8" />

          <path
            d="M136 122 C 140 110, 158 110, 166 120 C 154 130, 142 128, 136 122 Z"
            fill="#556A57"
            fillOpacity="0.88"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 220 165"
      fill="none"
      aria-hidden="true"
      className={className}
      style={flipX ? { transform: flipX } : undefined}
    >
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="135%" height="145%">
          <feDropShadow
            dx="2"
            dy="4"
            stdDeviation="2.5"
            floodColor="#2A2014"
            floodOpacity="0.22"
          />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        {/* Rama de olivo que nace al costado del soporte y abraza el canto de la madera */}
        <path
          d="M8 26 C 22 50, 24 82, 42 104 C 54 120, 68 138, 86 150"
          stroke="#5C5240"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Tallo tendido a lo largo del borde frontal de la repisa */}
        <path
          d="M34 90 C 68 92, 108 98, 152 94 C 174 92, 194 96, 208 102"
          stroke="#4A5D4E"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M96 96 C 118 112, 142 120, 168 118"
          stroke="#6E826D"
          strokeWidth="1.3"
          strokeLinecap="round"
        />

        {/* Hojas lanceoladas de olivo en el costado izquierdo (sin invadir la cubierta) */}
        <path
          d="M16 42 C 2 34, 4 16, 16 8 C 28 18, 28 32, 16 42 Z"
          fill="#4A5D4E"
          fillOpacity="0.95"
        />
        <path d="M16 38 L 16 12" stroke="#FAF7F2" strokeOpacity="0.42" strokeWidth="0.85" />

        <path
          d="M26 76 C 8 76, 4 62, 12 48 C 26 52, 32 64, 26 76 Z"
          fill="#6E826D"
          fillOpacity="0.92"
        />
        <path d="M23 72 L 14 52" stroke="#FAF7F2" strokeOpacity="0.4" strokeWidth="0.8" />

        {/* Hojas posadas sobre el canto frontal biselado y colgando hacia la pared */}
        <path
          d="M58 92 C 62 76, 80 72, 92 80 C 86 94, 72 98, 58 92 Z"
          fill="#4A5D4E"
          fillOpacity="0.94"
        />
        <path d="M62 90 L 88 82" stroke="#FAF7F2" strokeOpacity="0.42" strokeWidth="0.85" />

        <path
          d="M112 96 C 118 82, 136 80, 148 90 C 138 102, 124 102, 112 96 Z"
          fill="#5D7260"
          fillOpacity="0.9"
        />
        <path d="M116 95 L 144 90" stroke="#FAF7F2" strokeOpacity="0.4" strokeWidth="0.8" />

        <path
          d="M164 95 C 174 82, 192 84, 202 96 C 188 106, 174 104, 164 95 Z"
          fill="#3E5042"
          fillOpacity="0.92"
        />

        {/* Hojas que caen por debajo de la madera alrededor de la ménsula */}
        <path
          d="M96 102 C 86 114, 92 128, 106 130 C 114 118, 108 106, 96 102 Z"
          fill="#6E826D"
          fillOpacity="0.92"
        />
        <path d="M98 106 L 105 126" stroke="#FAF7F2" strokeOpacity="0.36" strokeWidth="0.75" />

        <path
          d="M134 114 C 142 102, 158 104, 168 116 C 156 126, 142 122, 134 114 Z"
          fill="#4A5D4E"
          fillOpacity="0.9"
        />

        <path
          d="M42 114 C 24 118, 22 136, 36 144 C 48 136, 52 124, 42 114 Z"
          fill="#556B58"
          fillOpacity="0.92"
        />
        <path d="M40 118 L 36 140" stroke="#FAF7F2" strokeOpacity="0.35" strokeWidth="0.8" />

        <path
          d="M66 138 C 60 152, 74 162, 88 156 C 86 142, 76 136, 66 138 Z"
          fill="#6E826D"
          fillOpacity="0.88"
        />
      </g>
    </svg>
  );
}
