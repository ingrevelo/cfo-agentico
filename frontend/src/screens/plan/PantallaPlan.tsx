// Pantalla 2: el plan de este ingreso. El plan lo arma el backend (acá, el mock):
// esta pantalla solo muestra lo que vino y pide el OK.
import { useState } from 'react';
import { api } from '../../api';
import { AvisoSintetico, Cargando, ErrorAviso, TituloPantalla, Vacio } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import Figura3D from '../../components/Figura3D';
import TarjetaPlan from '../../components/TarjetaPlan';
import { PERFILES } from '../../data/perfiles';
import { formatearFx, formatearUsd } from '../../formato';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';

export default function PantallaPlan() {
  const { estado, despachar } = useApp();
  const simular = useAccion(api.simularIngreso.bind(api));
  const perfil_id = estado.sesion?.perfil_id ?? 'sofia';
  const copy = PERFILES[perfil_id].copy;
  const minimo = estado.reglas?.hard_rules.min_income_trigger_usd ?? 0;
  /** El ingreso entró pero no alcanzó el disparo mínimo: se acumula para el siguiente. */
  const [acumulado, setAcumulado] = useState(false);

  async function simularIngreso() {
    const plan = await simular.ejecutar();
    if (plan === undefined) return;
    setAcumulado(plan === null);
    despachar({ tipo: 'plan', plan });
    despachar({
      tipo: 'anunciar',
      texto: plan ? 'Listo el plan de este ingreso.' : 'El ingreso no alcanza para armar un plan.',
    });
  }

  if (!estado.plan) {
    return (
      <div className="space-y-4 pb-24 md:pb-0">
        <header className="flex items-start justify-between gap-4">
          <TituloPantalla sub="Cuando entra dinero, el agente arma el plan solo. Acá lo disparás vos para verlo.">
            El plan de cada ingreso
          </TituloPantalla>
          <Figura3D tamano={96} />
        </header>

        <AvisoSintetico />
        {simular.cargando && <Cargando texto="Leyendo tu cuenta y armando el plan..." />}
        {simular.error && <ErrorAviso mensaje={simular.error} onReintentar={simularIngreso} />}

        {!simular.cargando && simular.error === null && !acumulado && (
          <Vacio titulo={copy.llega_ingreso}>
            Todavía no hay plan. Tocá "Simular ingreso" y el agente lee tu cuenta, la cotización y
            tus vencimientos para repartir el dinero.
          </Vacio>
        )}

        {!simular.cargando && acumulado && (
          <Vacio titulo="Este ingreso no dispara un plan">
            Es más chico que tu disparo mínimo de {formatearUsd(minimo)}, así que el dinero se queda
            quieto y se suma al próximo ingreso. Así no te lleno de aprobaciones por montos chicos.
          </Vacio>
        )}

        <BarraAccion
          etiqueta="Simular ingreso"
          etiquetaCargando="Armando el plan..."
          onClick={simularIngreso}
          cargando={simular.cargando}
        />
      </div>
    );
  }

  const plan = estado.plan;
  const reglas = estado.reglas?.hard_rules;
  const m3 = plan.movimientos.find((m) => m.tipo === 'conversion_a_pesos');

  const verificaciones = [
    plan.colchon_cubierto
      ? `Colchón intacto: te quedan ${formatearUsd(plan.quedan_en_dolares)} en dólares y tu mínimo es ${formatearUsd(reglas?.min_cushion_usd ?? 0)}.`
      : `Atención: bajarías de tu colchón de ${formatearUsd(reglas?.min_cushion_usd ?? 0)}.`,
    m3
      ? `Dentro del tope: ${formatearUsd(m3.monto_usd)} a pesos, y tu tope es ${formatearUsd(reglas?.max_conversion_usd ?? 0)}.`
      : 'Esta semana no hay nada que cambiar a pesos.',
    `Sin duplicados: este ingreso tiene un solo plan (${plan.plan_id}).`,
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ash-texto">{copy.llega_ingreso}</p>
          <TituloPantalla>{formatearUsd(plan.ingreso_usd)}</TituloPantalla>
          <p className="mt-2 text-sm text-ash-texto">
            Así lo reparte el agente. Nada se mueve hasta que vos digas que sí.
          </p>
        </div>
        <Figura3D tamano={96} />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <TarjetaPlan titulo="El plan de este ingreso" movimientos={plan.movimientos} />

        <div className="space-y-4">
          <section className="tarjeta space-y-3" aria-label="Resumen del plan">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-semibold">Libre para el día a día</span>
              <span className="text-xl font-bold tracking-[-0.04em]">
                {formatearUsd(plan.libre_usd)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-black/5 pt-3">
              <span className="text-sm font-semibold">Te quedan en dólares</span>
              <span className="text-xl font-bold tracking-[-0.04em]">
                {formatearUsd(plan.quedan_en_dolares)}
              </span>
            </div>
            {plan.banda_fx && (
              <p className="text-sm text-ash-texto">
                Cotización del plan: {formatearFx(plan.fx)}. Si el día del vencimiento está fuera de{' '}
                {formatearFx(plan.banda_fx.min)} a {formatearFx(plan.banda_fx.max)}, te vuelvo a
                preguntar.
              </p>
            )}
          </section>

          <section className="tarjeta" aria-label="Reglas verificadas">
            <h2 className="text-xl">Qué reglas se verificaron</h2>
            <ul className="mt-3 space-y-2">
              {verificaciones.map((v) => (
                <li key={v} className="flex gap-2 text-sm leading-snug text-ash-texto">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
                  {v}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <AvisoSintetico />

      <BarraAccion
        etiqueta="Aprobar plan"
        onClick={() => despachar({ tipo: 'ir', vista: 'aprobacion' })}
        secundaria={
          <button
            type="button"
            className="boton-texto w-full md:w-auto"
            onClick={() => despachar({ tipo: 'ir', vista: 'aprobacion' })}
          >
            Probar el Caso Rojo
          </button>
        }
      />

      {minimo > plan.ingreso_usd && (
        <p className="text-sm text-ash-texto">
          Ojo: tu disparo mínimo es {formatearUsd(minimo)}, así que un ingreso más chico se
          acumularía para el siguiente plan.
        </p>
      )}
    </div>
  );
}
