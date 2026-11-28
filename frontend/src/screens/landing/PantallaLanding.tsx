// Pantalla de entrada: el problema, la propuesta y por qué se le puede confiar.
import Figura3D from '../../components/Figura3D';
import { TituloPantalla } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import { useApp } from '../../state/contexto';

const PASOS = [
  {
    titulo: 'Aprende de tus movimientos',
    texto: 'Mira lo que se repite en tu cuenta y te propone reglas. Vos las confirmás.',
  },
  {
    titulo: 'Arma el plan de cada ingreso',
    texto: 'Cuando entra dinero, reparte lo justo para cada cosa y te explica por qué.',
  },
  {
    titulo: 'Vos aprobás',
    texto: 'Nada se mueve sin tu OK, y el código frena lo que rompe tus reglas.',
  },
];

const CONFIANZA = [
  'Vos aprobás cada plan, y cada movimiento real se aprueba otra vez en Belo.',
  'Los límites viven en el código, no en un texto que el modelo pueda ignorar.',
  'Todo lo que pasa queda en un registro que podés revisar.',
  'Lo que no es real dice SIMULATED. Nunca se finge un movimiento.',
];

export default function PantallaLanding() {
  const { despachar } = useApp();

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <header className="flex items-start justify-between gap-4">
        <TituloPantalla sub="Un mini CFO dentro de Belo que aprende de tus movimientos y arma el plan de cada ingreso.">
          CFO Agéntico
        </TituloPantalla>
        <Figura3D tamano={112} />
      </header>

      <section className="tarjeta">
        <h2 className="text-xl">El problema</h2>
        <p className="mt-2 text-sm leading-relaxed text-ash-texto">
          Cobrás en una moneda y pagás en otra. Cada ingreso trae la misma pregunta: ¿cuánto cambio,
          cuándo y qué aparto? Sin un plan, el dinero entra y sale el mismo día, y una devaluación te
          encuentra con todo en la moneda equivocada.
        </p>
      </section>

      <section>
        <h2 className="text-xl">Cómo funciona</h2>
        <ol className="mt-3 space-y-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="tarjeta flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
              >
                {i + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold">{paso.titulo}</span>
                <span className="mt-1 block text-sm leading-snug text-ash-texto">{paso.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="tarjeta">
        <h2 className="text-xl">Por qué podés confiarle el dinero</h2>
        <ul className="mt-3 space-y-2">
          {CONFIANZA.map((t) => (
            <li key={t} className="flex gap-2 text-sm leading-snug text-ash-texto">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <BarraAccion etiqueta="Probar la demo" onClick={() => despachar({ tipo: 'ir', vista: 'login' })} />

      <footer className="text-xs leading-relaxed text-ash-texto">
        Demo con datos sintéticos de Dev IngenierIA para el Hackathon 30X. No usa datos reales de
        ninguna persona ni mueve dinero.
      </footer>
    </div>
  );
}
