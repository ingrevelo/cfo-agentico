// Figura decorativa: un objeto abstracto, negro cromado, al estilo de los 3D de Belo.
// Hecha solo con SVG y CSS (sin three.js). Es decorativa: aria-hidden, no se lee.
interface Props {
  /** Lado en píxeles. 120 en celular, 160 o más en pantallas grandes. */
  tamano?: number;
  className?: string;
}

export default function Figura3D({ tamano = 120, className = '' }: Props) {
  return (
    <div className={`figura-flota shrink-0 ${className}`} aria-hidden="true">
      <svg width={tamano} height={tamano} viewBox="0 0 200 200" role="presentation">
        <defs>
          {/* Fondo gris claro detrás del objeto. */}
          <radialGradient id="f3d-fondo" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EDEDED" />
          </radialGradient>
          {/* Cromado: casi blanco arriba, negro abajo. */}
          <radialGradient id="f3d-cromo" cx="34%" cy="24%" r="78%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="22%" stopColor="#B8B8B8" />
            <stop offset="52%" stopColor="#3A3A3A" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
          {/* Brillo suave sobre el lomo de la forma. */}
          <radialGradient id="f3d-brillo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <filter id="f3d-sombra" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        <circle cx="100" cy="100" r="96" fill="url(#f3d-fondo)" />

        {/* Sombra apoyada en el piso. */}
        <ellipse cx="102" cy="162" rx="52" ry="11" fill="#000000" opacity="0.16" filter="url(#f3d-sombra)" />

        {/* Forma orgánica con brazos curvos y un hueco en el medio. */}
        <path
          fillRule="evenodd"
          fill="url(#f3d-cromo)"
          d="M104 22 C150 14 190 52 182 98 C176 140 146 160 112 166
             C78 172 44 160 28 134 C8 102 20 60 52 36 C66 25 86 24 104 22 Z
             M100 70 C120 66 138 80 136 100 C134 120 116 132 98 128
             C80 124 68 108 71 92 C74 79 86 72 100 70 Z"
        />

        {/* Highlights blancos: el reflejo grande y dos chispas. */}
        <ellipse cx="74" cy="56" rx="26" ry="17" fill="url(#f3d-brillo)" transform="rotate(-28 74 56)" />
        <ellipse cx="150" cy="118" rx="12" ry="26" fill="url(#f3d-brillo)" opacity="0.5" transform="rotate(18 150 118)" />
        <circle cx="120" cy="40" r="4" fill="#FFFFFF" opacity="0.9" />
      </svg>
    </div>
  );
}
