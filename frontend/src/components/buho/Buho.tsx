// El búho CFO. Recorta una pose de la hoja con background-position, sin librerías.
// Si la imagen todavía no está guardada, muestra un emoji y nada se rompe.
import { useEffect, useState } from 'react';
import { ALT, RECORTES, SPRITE, SPRITE_ALTO, SPRITE_ANCHO, type Expresion } from './poses';

/** Precarga la imagen. Devuelve false mientras carga o si no existe. */
export function useImagenDisponible(src: string): boolean {
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    let vigente = true;
    const img = new Image();
    img.onload = () => vigente && setDisponible(true);
    img.onerror = () => vigente && setDisponible(false);
    img.src = src;
    return () => {
      vigente = false;
    };
  }, [src]);
  return disponible;
}

interface Props {
  expresion: Expresion;
  /** Lado en píxeles. 56 en los avatares del chat, 160 o más en la home. */
  tamano: number;
  /** Si se pasa, el búho se lee; si no, es decorativo. */
  alt?: string;
  className?: string;
  /** Imagen propia (la home usa buho-hero). */
  src?: string;
  redondo?: boolean;
}

export default function Buho({ expresion, tamano, alt, className = '', src, redondo }: Props) {
  const hoja = SPRITE();
  const propia = Boolean(src);
  const hayPropia = useImagenDisponible(src ?? hoja);
  const hayHoja = useImagenDisponible(hoja);
  const r = RECORTES[expresion];

  const forma = redondo ? 'rounded-full' : 'rounded-3xl';
  const base = `shrink-0 overflow-hidden bg-violeta-suave ${forma} ${className}`;
  const etiqueta = alt
    ? { role: 'img' as const, 'aria-label': alt }
    : { 'aria-hidden': true as const };
  const medidas = { width: tamano, height: tamano, maxWidth: '100%' };

  // La home usa su propia imagen entera, sin recortar.
  if (propia && hayPropia) {
    return (
      <div
        className={base}
        style={{
          ...medidas,
          backgroundImage: `url("${src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        {...etiqueta}
      />
    );
  }

  if (hayHoja) {
    // La hoja se agranda hasta que el recorte ocupe toda la caja y después se
    // desplaza hasta la pose que toca. Los porcentajes van sobre lo que sobra de
    // la imagen, que es como los interpreta background-position.
    return (
      <div
        className={base}
        style={{
          ...medidas,
          backgroundImage: `url("${hoja}")`,
          backgroundSize: `${(SPRITE_ANCHO / r.ancho) * 100}% ${(SPRITE_ALTO / r.alto) * 100}%`,
          backgroundPosition: `${(r.x / (SPRITE_ANCHO - r.ancho)) * 100}% ${(r.y / (SPRITE_ALTO - r.alto)) * 100}%`,
        }}
        {...etiqueta}
      />
    );
  }

  // Sin imágenes: el emoji, para que la demo nunca se vea rota.
  return (
    <div
      className={`${base} flex items-center justify-center`}
      style={{ ...medidas, fontSize: tamano * 0.5 }}
      title={ALT[expresion]}
      {...etiqueta}
    >
      <span aria-hidden="true">🦉</span>
    </div>
  );
}
