// El armazón de la app: el proveedor del estado, la barra de pasos, la pantalla
// que toca según `vista`, y la región que anuncia los cambios a un lector de pantalla.
import { AvisoSintetico } from './components/avisos';
import BarraPasos from './components/BarraPasos';
import { ProveedorApp, useApp } from './state/contexto';
import PantallaAprobacion from './screens/aprobacion/PantallaAprobacion';
import PantallaLanding from './screens/landing/PantallaLanding';
import PantallaLogin from './screens/login/PantallaLogin';
import PantallaPerfilado from './screens/perfilado/PantallaPerfilado';
import PantallaPlan from './screens/plan/PantallaPlan';
import PantallaReglas from './screens/reglas/PantallaReglas';
import PantallaResumen from './screens/resumen/PantallaResumen';

function Contenido() {
  const { estado } = useApp();
  const conPasos = estado.vista !== 'landing' && estado.vista !== 'login';

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-10 pt-6">
      {/* Lo que acaba de pasar, para quien usa un lector de pantalla. */}
      <p aria-live="polite" className="sr-only">
        {estado.anuncio}
      </p>

      {conPasos && <BarraPasos />}

      <main>
        {estado.vista === 'landing' && <PantallaLanding />}
        {estado.vista === 'login' && <PantallaLogin />}
        {estado.vista === 'perfilado' && <PantallaPerfilado />}
        {estado.vista === 'reglas' && <PantallaReglas />}
        {estado.vista === 'plan' && <PantallaPlan />}
        {estado.vista === 'aprobacion' && <PantallaAprobacion />}
        {estado.vista === 'resumen' && <PantallaResumen />}
      </main>

      {estado.vista !== 'landing' && (
        <footer className="mt-10 space-y-3">
          <AvisoSintetico />
          <p className="text-xs leading-relaxed text-ash-texto">
            CFO Agéntico · Dev IngenierIA. Los datos de esta demo son inventados y no corresponden a
            ninguna persona ni empresa real.
          </p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProveedorApp>
      <Contenido />
    </ProveedorApp>
  );
}
