// Las reglas, editables. Guardar rearma el plan si todavía no se aprobó.
import { useState } from 'react';
import { api } from '../../api';
import type { Reglas as ReglasTipo, ReglasDuras } from '../../api/tipos';
import { explicarVencimiento, formatearUsd } from '../../formato';
import { useApp } from '../../state/contexto';
import { faseDe } from '../../state/fases';
import { useAccion } from '../../state/useAccion';
import { ErrorAviso } from '../avisos';
import CampoNumero from './CampoNumero';
import { CAMPOS, validarRegla } from './campos';

export default function Reglas() {
  const { estado, despachar } = useApp();
  const guardar = useAccion(api.guardarReglas.bind(api));
  const resimular = useAccion(api.simularIngreso.bind(api));
  const [borrador, setBorrador] = useState<ReglasTipo | null>(null);
  const [guardado, setGuardado] = useState(false);

  const reglas = borrador ?? estado.reglas;
  if (!reglas) return null;

  const errores = CAMPOS.map((c) => validarRegla(c, reglas.hard_rules[c.campo] as number));
  const hayError = errores.some(Boolean);

  async function confirmar() {
    if (!reglas || hayError) return;
    const guardadas = await guardar.ejecutar(reglas);
    if (!guardadas) return;
    despachar({ tipo: 'reglas', reglas: guardadas });
    // Si el plan todavía está en propuesta, se rearma con las reglas nuevas.
    if (faseDe(estado.plan) === 'propuesta') {
      const plan = await resimular.ejecutar();
      if (plan !== undefined) despachar({ tipo: 'plan', plan });
    }
    setGuardado(true);
    despachar({ tipo: 'anunciar', texto: 'Reglas guardadas.' });
  }

  return (
    <section>
      <h3 className="text-xl">Tus reglas</h3>
      {guardar.error && <ErrorAviso mensaje={guardar.error} onReintentar={confirmar} />}

      <div className="mt-2 divide-y divide-violeta-suave">
        {CAMPOS.map((c, i) => (
          <CampoNumero
            key={c.campo}
            id={c.campo}
            etiqueta={c.etiqueta}
            ayuda={c.ayuda}
            sufijo={c.sufijo}
            valor={reglas.hard_rules[c.campo] as number}
            error={errores[i]}
            onChange={(valor) =>
              setBorrador({
                ...reglas,
                hard_rules: { ...reglas.hard_rules, [c.campo]: valor } as ReglasDuras,
              })
            }
          />
        ))}

        {reglas.dues.map((v) => (
          <CampoNumero
            key={v.id}
            id={'venc-' + v.id}
            etiqueta={v.label}
            ayuda={explicarVencimiento(v.due, v.due_day)}
            sufijo={v.currency}
            valor={v.amount}
            insignia={v.origen === 'perfilado' ? 'Lo encontró el agente' : undefined}
            error={v.amount < 0 ? 'No puede ser negativo.' : null}
            onChange={(amount) =>
              setBorrador({
                ...reglas,
                dues: reglas.dues.map((d) => (d.id === v.id ? { ...d, amount } : d)),
              })
            }
          />
        ))}
      </div>

      <p className="mt-2 text-base text-tinta-suave">
        Ingreso de la demo: {formatearUsd(estado.sesion?.saldos.USD ?? 0)}. Para cambiarlo falta un
        método en la API (ver CfoApi.ts).
      </p>

      <button
        type="button"
        className="boton-primario mt-4"
        onClick={confirmar}
        disabled={guardar.cargando || hayError}
        aria-busy={guardar.cargando}
      >
        {guardar.cargando ? 'Guardando...' : 'Guardar'}
      </button>
      {guardado && !guardar.cargando && (
        <p role="status" className="mt-2 text-base text-exito-texto">
          Guardado.
        </p>
      )}
    </section>
  );
}
