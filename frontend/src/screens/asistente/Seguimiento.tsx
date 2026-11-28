// Lo que pasa DESPUÉS de aprobar: los estados, la confirmación en Belo,
// el dólar que se movió y el cierre.
import type { EntradaLog, Movimiento, Plan } from '../../api/tipos';
import { diaEnCastellano } from '../../formato';
import type { Fase } from '../../state/fases';
import Burbuja from './Burbuja';
import PasoBelo from './PasoBelo';
import Pista from './Pista';
import TarjetaFinal from './TarjetaFinal';

interface Props {
  plan: Plan;
  fase: Fase;
  log: EntradaLog[];
  pendientesBelo: Movimiento[];
  retenido?: Movimiento;
  programado?: Movimiento;
  editando: boolean;
  reiniciando: boolean;
  onPlan: (plan: Plan) => void;
  onAnuncio: (texto: string) => void;
  onReproponer: (m: Movimiento) => void;
  onReiniciar: () => void;
}

export default function Seguimiento(p: Props) {
  return (
    <>
      <Burbuja
        expresion="aprobando"
        texto={
          p.pendientesBelo.length > 0
            ? 'Tu OK quedó registrado. Falta confirmar en Belo.'
            : 'Tu OK quedó registrado.'
        }
      >
        <div className="space-y-4">
          {p.plan.movimientos.map((m) => (
            <Pista key={m.clave} estado={m.estado} titulo={m.titulo} />
          ))}
          {p.pendientesBelo.map((m) => (
            <PasoBelo
              key={m.clave}
              plan_id={p.plan.plan_id}
              movimiento={m}
              onPlan={p.onPlan}
              onAnuncio={p.onAnuncio}
            />
          ))}
        </div>
      </Burbuja>

      {p.retenido && (
        <Burbuja
          expresion="revisando"
          texto="El dólar se movió más de 2%. Frené el cambio y te armo una propuesta nueva."
        >
          <button
            type="button"
            className="boton-primario"
            onClick={() => p.onReproponer(p.retenido!)}
            disabled={p.editando}
            aria-busy={p.editando}
          >
            Ver propuesta nueva
          </button>
        </Burbuja>
      )}

      {p.fase === 'desconocido' && (
        <Burbuja expresion="dudando" texto="No recibí confirmación. Reviso antes de repetir nada." />
      )}

      {p.programado && (
        <Burbuja
          expresion="esperando"
          texto={`Lo del ${diaEnCastellano(p.programado.programado_para ?? '')} queda programado.`}
        />
      )}

      {p.fase === 'completado' && (
        <Burbuja expresion="completado" texto="¡Todo en orden! Ejecuté todo tu plan.">
          <TarjetaFinal log={p.log} reiniciando={p.reiniciando} onReiniciar={p.onReiniciar} />
        </Burbuja>
      )}
    </>
  );
}
