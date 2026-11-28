// Home: el búho saluda, un titular corto y UN botón. Sin scroll en celular.
import Buho from '../components/buho/Buho';
import { HERO } from '../components/buho/poses';
import { useApp } from '../state/contexto';

const PASTILLAS = ['Vos aprobás', 'El código frena', 'Todo queda registrado'];

export default function Home() {
  const { despachar } = useApp();

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-6 md:flex-row md:items-center md:gap-8">
      <Buho
        expresion="reposo"
        src={HERO()}
        tamano={180}
        alt="Búho CFO, el asistente de la demo"
        className="mx-auto md:mx-0"
      />

      <div className="text-center md:text-left">
        <h1 tabIndex={-1} className="break-words text-4xl outline-none">
          Tu CFO personal.
        </h1>
        <p className="mt-4 text-base text-tinta-suave">Un plan para cada ingreso. Vos aprobás.</p>

        <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
          {PASTILLAS.map((p) => (
            <li key={p} className="chip">
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <button
            type="button"
            className="boton-primario"
            onClick={() => despachar({ tipo: 'ir', vista: 'modo' })}
          >
            Probar la demo
          </button>
          <button
            type="button"
            className="boton-secundario mt-2 w-full"
            aria-disabled="true"
            disabled
            title="Simulado: en la demo no hay OAuth real"
          >
            Iniciar sesión con Belo
          </button>
        </div>
      </div>
    </div>
  );
}
