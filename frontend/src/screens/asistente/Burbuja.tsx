// Un mensaje del búho: su avatar con la expresión que corresponde y el texto al lado.
// El avatar es decorativo (el texto ya dice lo mismo) para no leerlo dos veces.
import type { ReactNode } from 'react';
import Buho from '../../components/buho/Buho';
import type { Expresion } from '../../components/buho/poses';

interface Props {
  expresion: Expresion;
  texto: string;
  children?: ReactNode;
}

export default function Burbuja({ expresion, texto, children }: Props) {
  return (
    <li className="aparece flex gap-3">
      <Buho expresion={expresion} tamano={56} redondo />
      <div className="min-w-0 flex-1">
        <p className="break-words rounded-3xl rounded-tl-md bg-violeta-suave px-4 py-3 text-base">{texto}</p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </li>
  );
}
