// Galería de chequeo: se abre con ?galeria-buho en la URL.
// Sirve para ver de un vistazo si el recorte de la hoja está bien alineado.
import Buho from './Buho';
import { CELDAS, EXPRESIONES } from './poses';

export default function GaleriaBuho() {
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="text-3xl">Las 12 poses del búho</h1>
      <p className="mt-2 text-base text-tinta-suave">
        Si alguna aparece corrida o cortada, el recorte de la hoja no coincide: avisame las medidas
        del PNG. Sin la imagen guardada vas a ver el emoji de reemplazo.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {EXPRESIONES.map((e) => (
          <li key={e} className="tarjeta text-center">
            <Buho expresion={e} tamano={120} className="mx-auto" />
            <p className="mt-2 text-base font-semibold">{e}</p>
            <p className="text-sm text-tinta-suave">
              fila {CELDAS[e][0]}, columna {CELDAS[e][1]}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
