// Pantalla 4: qué pasó, con cuánto dinero, y la auditoría completa.
// El resumen se arma con una plantilla a partir del estado real; en producción
// lo redacta el LLM a partir de los números del motor (nodo compose_plan).
import { useEffect } from 'react';
import { api } from '../../api';
import type { Plan, Saldos } from '../../api/tipos';
import { AvisoSintetico, Cargando, ErrorAviso, TituloPantalla, Vacio } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import { PERFILES } from '../../data/perfiles';
import { diaEnCastellano, formatearArs, formatearUsd } from '../../formato';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';
import TablaLog from './TablaLog';

/** Arma el resumen en castellano simple con lo que realmente pasó. */
function redactarResumen(plan: Plan, impuestos: string): string[] {
  const frases: string[] = [];
  for (const m of plan.movimientos) {
    const monto = formatearUsd(m.monto_usd);
    if (m.tipo === 'rendimiento') {
      frases.push(
        m.estado === 'Completado'
          ? `Dejé ${monto} rindiendo en ${m.moneda_destino}. El rendimiento es variable, no garantizado.`
          : `${monto} van a quedar rindiendo en ${m.moneda_destino} (${m.estado.toLowerCase()}).`,
      );
    }
    if (m.tipo === 'alcancia') {
      frases.push(
        m.estado === 'Completado'
          ? `Aparté ${monto} para ${impuestos}.`
          : `${monto} esperan para ${impuestos} (${m.estado.toLowerCase()}).`,
      );
    }
    if (m.tipo === 'conversion_a_pesos') {
      const pesos = m.monto_ars ? ' para recibir ' + formatearArs(m.monto_ars) : '';
      const dia = m.programado_para ? ' el ' + diaEnCastellano(m.programado_para) : '';
      frases.push(
        m.estado === 'Completado'
          ? `Cambié ${monto}${pesos}.`
          : `Cambio ${monto}${dia}${pesos}, si el dólar sigue cerca de lo que aprobaste (${m.estado.toLowerCase()}).`,
      );
    }
  }
  frases.push(`Te quedan ${formatearUsd(plan.libre_usd)} libres para el día a día.`);
  return frases;
}

const FILAS_SALDOS: { clave: keyof Saldos; etiqueta: string; moneda: 'USD' | 'ARS' }[] = [
  { clave: 'USD', etiqueta: 'Cuenta en dólares', moneda: 'USD' },
  { clave: 'USDT', etiqueta: 'Rindiendo en USDT', moneda: 'USD' },
  { clave: 'alcancia_impuestos_usd', etiqueta: 'Alcancía "Impuestos"', moneda: 'USD' },
  { clave: 'ARS', etiqueta: 'Pesos', moneda: 'ARS' },
];

export default function PantallaResumen() {
  const { estado, despachar } = useApp();
  const traerLog = useAccion(api.obtenerLog.bind(api));
  const reiniciar = useAccion(api.reiniciarDemo.bind(api));

  useEffect(() => {
    let vigente = true;
    traerLog.ejecutar().then((log) => {
      if (vigente && log) despachar({ tipo: 'log', log });
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.plan]);

  if (!estado.plan) {
    return (
      <Vacio titulo="Todavía no hay nada que resumir">
        Simulá un ingreso y aprobá el plan para ver el resumen.
      </Vacio>
    );
  }

  const plan = estado.plan;
  const perfil_id = estado.sesion?.perfil_id ?? 'sofia';
  const impuestos = PERFILES[perfil_id].copy.textos_plan.impuestos;
  const frases = redactarResumen(plan, impuestos);

  async function reiniciarTodo() {
    const ok = await reiniciar.ejecutar();
    if (ok === undefined && reiniciar.error) return;
    despachar({ tipo: 'reiniciar' });
    despachar({ tipo: 'anunciar', texto: 'Demo reiniciada: volvés al inicio.' });
  }

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <TituloPantalla sub="Esto es lo que hice, por qué y con cuánto dinero.">
        Listo, esto quedó hecho
      </TituloPantalla>

      <section className="tarjeta">
        <h2 className="text-xl">El resumen</h2>
        <ul className="mt-3 space-y-2">
          {frases.map((f) => (
            <li key={f} className="flex gap-2 text-sm leading-snug">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="tarjeta" aria-label="Saldos finales">
        <h2 className="text-xl">Cómo quedaron tus saldos</h2>
        <dl className="mt-3 space-y-2">
          {FILAS_SALDOS.map((fila) => (
            <div
              key={fila.clave}
              className="flex items-baseline justify-between gap-4 border-b border-black/5 pb-2 last:border-0"
            >
              <dt className="text-sm text-ash-texto">{fila.etiqueta}</dt>
              <dd className="text-lg font-bold tracking-[-0.04em]">
                {fila.moneda === 'USD'
                  ? formatearUsd(plan.saldos[fila.clave])
                  : formatearArs(plan.saldos[fila.clave])}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <details className="tarjeta">
        <summary className="cursor-pointer text-sm font-semibold">Auditoría · MCP Log</summary>
        <p className="mt-2 text-sm leading-snug text-ash-texto">
          Cada herramienta que se llamó, con su regla, su estado y su monto. Todo lleva el sello
          SIMULATED: pasá el mouse por encima para ver por qué.
        </p>
        <div className="mt-4">
          {traerLog.cargando && <Cargando texto="Buscando el registro..." />}
          {traerLog.error && (
            <ErrorAviso mensaje={traerLog.error} onReintentar={() => traerLog.ejecutar()} />
          )}
          {!traerLog.cargando && <TablaLog log={estado.log} />}
        </div>
      </details>

      <AvisoSintetico />
      {reiniciar.error && <ErrorAviso mensaje={reiniciar.error} onReintentar={reiniciarTodo} />}

      <BarraAccion
        etiqueta="Reiniciar demo"
        etiquetaCargando="Reiniciando..."
        onClick={reiniciarTodo}
        cargando={reiniciar.cargando}
      />
    </div>
  );
}
