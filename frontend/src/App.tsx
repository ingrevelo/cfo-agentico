import { useState } from 'react';
import { obtenerSofia, type ReglasDuras, type Vencimiento } from './api/cliente';
import PantallaReglas from './screens/reglas/PantallaReglas';
import PantallaPlan from './screens/plan/PantallaPlan';
import PantallaAprobacion from './screens/aprobacion/PantallaAprobacion';
import PantallaResumen from './screens/resumen/PantallaResumen';

type Pantalla = 'reglas' | 'plan' | 'aprobacion' | 'resumen';

const PASOS: { id: Pantalla; nombre: string }[] = [
  { id: 'reglas', nombre: 'Reglas' },
  { id: 'plan', nombre: 'Plan' },
  { id: 'aprobacion', nombre: 'Aprobación' },
  { id: 'resumen', nombre: 'Resumen' },
];

export default function App() {
  const datos = obtenerSofia();

  // Navegación entre las 4 pantallas, sin router: una sola variable de estado.
  const [pantalla, setPantalla] = useState<Pantalla>('reglas');

  // Las reglas editadas viven acá, así la pantalla del plan usa lo que Sofía confirmó.
  const [reglas, setReglas] = useState<ReglasDuras>(datos.hard_rules);
  const [vencimientos, setVencimientos] = useState<Vencimiento[]>(datos.dues);

  const cambiarRegla = (campo: keyof ReglasDuras, valor: number) =>
    setReglas((previas) => ({ ...previas, [campo]: valor }));

  const cambiarVencimiento = (id: string, monto: number) =>
    setVencimientos((previos) => previos.map((v) => (v.id === id ? { ...v, amount: monto } : v)));

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-10 pt-6">
      <nav aria-label="Pasos de la demo" className="mb-6 flex flex-wrap gap-1">
        {PASOS.map((paso) => (
          <button
            key={paso.id}
            type="button"
            aria-current={pantalla === paso.id ? 'step' : undefined}
            onClick={() => setPantalla(paso.id)}
            className={
              pantalla === paso.id
                ? 'h-10 rounded-full bg-ink px-4 text-sm font-semibold text-white'
                : 'boton-texto'
            }
          >
            {paso.nombre}
          </button>
        ))}
      </nav>

      <main>
        {pantalla === 'reglas' && (
          <PantallaReglas
            datos={datos}
            reglas={reglas}
            vencimientos={vencimientos}
            onCambiarRegla={cambiarRegla}
            onCambiarVencimiento={cambiarVencimiento}
            onConfirmar={() => setPantalla('plan')}
          />
        )}
        {pantalla === 'plan' && (
          <PantallaPlan
            datos={datos}
            reglas={reglas}
            vencimientos={vencimientos}
            onAprobar={() => setPantalla('aprobacion')}
          />
        )}
        {pantalla === 'aprobacion' && <PantallaAprobacion />}
        {pantalla === 'resumen' && <PantallaResumen />}
      </main>

      <footer className="mt-10 text-xs leading-relaxed text-ash">
        CFO Agéntico · Dev IngenierIA · {datos._nota}
      </footer>
    </div>
  );
}
