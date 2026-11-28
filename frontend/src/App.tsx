// El armazón: columna flex de alto mínimo 100dvh, con el pie SIEMPRE en el flujo
// normal (nunca fixed), así nunca se corta ni tapa el contenido.
import { useState } from 'react';
import GaleriaBuho from './components/buho/GaleriaBuho';
import BarraSuperior from './components/BarraSuperior';
import HojaAjustes from './components/ajustes/HojaAjustes';
import Asistente from './screens/Asistente';
import Home from './screens/Home';
import Modo from './screens/Modo';
import { ProveedorApp, useApp } from './state/contexto';

function Contenido() {
  const { estado } = useApp();
  const [ajustes, setAjustes] = useState(false);

  return (
    <div
      className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <p aria-live="polite" className="sr-only">
        {estado.anuncio}
      </p>

      {estado.vista === 'asistente' && <BarraSuperior onAjustes={() => setAjustes(true)} />}

      <main className="flex flex-1 flex-col">
        {estado.vista === 'home' && <Home />}
        {estado.vista === 'modo' && <Modo />}
        {estado.vista === 'asistente' && <Asistente />}
      </main>

      <footer className="pt-8 text-sm text-tinta-suave">Demo con datos sintéticos.</footer>

      {estado.vista === 'asistente' && (
        <HojaAjustes abierta={ajustes} onCerrar={() => setAjustes(false)} />
      )}
    </div>
  );
}

export default function App() {
  // Galería de chequeo del búho: ?galeria-buho en la URL.
  if (typeof window !== 'undefined' && window.location.search.includes('galeria-buho')) {
    return <GaleriaBuho />;
  }

  return (
    <ProveedorApp>
      <Contenido />
    </ProveedorApp>
  );
}
