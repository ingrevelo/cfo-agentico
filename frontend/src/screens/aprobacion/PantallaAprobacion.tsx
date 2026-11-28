import EstadoBadge from '../../components/EstadoBadge';
import Figura3D from '../../components/Figura3D';

/** Placeholder de la pantalla 3. Se construye en la rama front/pantalla-aprobacion. */
export default function PantallaAprobacion() {
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Caso Rojo y aprobación</h1>
          <p className="mt-2 text-sm text-ash">Se arma en la siguiente rama.</p>
        </div>
        <Figura3D tamano={96} />
      </header>

      <section className="tarjeta space-y-3">
        <h2 className="text-xl">Qué va a ir acá</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-snug text-ash">
          <li>El Caso Rojo: Sofía pide cambiar USD 1.100 y el motor lo bloquea, porque rompería su colchón.</li>
          <li>El OK del plan válido y cada movimiento con su estado a la vista.</li>
          <li>El aviso de que la aprobación final de cada movimiento real la pide Belo, con un código por correo.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <EstadoBadge estado="Propuesto" />
          <EstadoBadge estado="Aprobado" />
          <EstadoBadge estado="Ejecutando" />
          <EstadoBadge estado="Completado" />
          <EstadoBadge estado="Retenido" />
        </div>
      </section>
    </div>
  );
}
