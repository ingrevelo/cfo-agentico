import Figura3D from '../../components/Figura3D';
import SimulatedBadge from '../../components/SimulatedBadge';

/** Placeholder de la pantalla 4. Se construye en la rama front/pantalla-resumen-log. */
export default function PantallaResumen() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Resumen y MCP Log</h1>
          <p className="mt-2 text-sm text-ash">Se arma en la siguiente rama.</p>
        </div>
        <Figura3D tamano={96} />
      </header>

      <section className="tarjeta space-y-3">
        <h2 className="text-xl">Qué va a ir acá</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-snug text-ash">
          <li>El resumen: qué se hizo, por qué y con cuánto dinero.</li>
          <li>El MCP Log: cada herramienta llamada con su identificador y su estado.</li>
          <li>
            El sello <SimulatedBadge /> en cada paso que no corrió en vivo.
          </li>
        </ul>
      </section>
    </div>
  );
}
