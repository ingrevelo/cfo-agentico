// El búho CFO. Recorta una pose de la hoja con background-position, sin librerías.
// Si la imagen todavía no está guardada, muestra un emoji y nada se rompe.
import { useEffect, useState } from 'react';
import { ALT, CELDAS, COLUMNAS, FILAS, SPRITE, type Expresion } from './poses';

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
  /** Imagen propia (la home usa buho-hero.png). */
  src?: string;
  redondo?: boolean;
}

export default function Buho({ expresion, tamano, alt, className = '', src, redondo }: Props) {
  const hoja = SPRITE();
  const propia = Boolean(src);
  const hayPropia = useImagenDisponible(src ?? hoja);
  const hayHoja = useImagenDisponible(hoja);
  const [fila, columna] = CELDAS[expresion];

  const forma = redondo ? 'rounded-full' : 'rounded-3xl';
  const base = `shrink-0 overflow-hidden bg-violeta-suave ${forma} ${className}`;
  const etiqueta = alt
    ? { role: 'img' as const, 'aria-label': alt }
    : { 'aria-hidden': true as const };

  // La home usa su propia imagen entera, sin recortar.
  if (propia && hayPropia) {
    return (
      <div
        className={base}
        style={{
          width: tamano,
          maxWidth: "100%",
          height: tamano,
          backgroundImage: `url("${src}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        {...etiqueta}
      />
    );
  }

  if (hayHoja) {
    return (
      <div
        className={base}
        style={{
          width: tamano,
          maxWidth: "100%",
          height: tamano,
          backgroundImage: `url("${hoja}")`,
          backgroundSize: `${COLUMNAS * 100}% ${FILAS * 100}%`,
          backgroundPosition: `${(columna / (COLUMNAS - 1)) * 100}% ${(fila / (FILAS - 1)) * 100}%`,
        }}
        {...etiqueta}
      />
    );
  }

  // Sin imágenes: el emoji, para que la demo nunca se vea rota.
  return (
    <div
      className={`${base} flex items-center justify-center`}
      style={{ width: tamano, height: tamano, maxWidth: "100%", fontSize: tamano * 0.5 }}
      title={ALT[expresion]}
      {...etiqueta}
    >
      <span aria-hidden="true">🦉</span>
    </div>
  );
}
