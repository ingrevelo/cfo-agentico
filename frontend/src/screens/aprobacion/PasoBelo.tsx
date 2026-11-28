// El segundo OK de un movimiento: pide el link de Belo y confirma con el código.
// En la versión real el link lo genera el MCP y el código llega por correo (D13).
import { useEffect, useState } from 'react';
import { api } from '../../api';
import type { EnlaceBelo as DatosEnlace, Movimiento, Plan } from '../../api/tipos';
import EnlaceBelo from '../../components/EnlaceBelo';
import { Cargando, ErrorAviso } from '../../components/avisos';
import { useAccion } from '../../state/useAccion';

interface Props {
  plan_id: string;
  movimiento: Movimiento;
  onPlan: (plan: Plan) => void;
  onAnuncio: (texto: string) => void;
}

export default function PasoBelo({ plan_id, movimiento, onPlan, onAnuncio }: Props) {
  const traer = useAccion(api.obtenerEnlaceBelo.bind(api));
  const confirmar = useAccion(api.confirmarEnlaceBelo.bind(api));
  const [enlace, setEnlace] = useState<DatosEnlace | null>(null);

  useEffect(() => {
    let vigente = true;
    traer.ejecutar(plan_id, movimiento.paso).then((e) => {
      if (vigente && e) setEnlace(e);
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan_id, movimiento.paso]);

  if (traer.error) {
    return <ErrorAviso mensaje={traer.error} onReintentar={() => traer.ejecutar(plan_id, movimiento.paso)} />;
  }
  if (!enlace) return <Cargando texto="Pidiendo el link de aprobación a Belo..." />;

  return (
    <EnlaceBelo
      enlace={enlace}
      cargando={confirmar.cargando}
      error={confirmar.error}
      onConfirmar={async (codigo) => {
        const plan = await confirmar.ejecutar(plan_id, movimiento.paso, codigo);
        if (!plan) return;
        onPlan(plan);
        onAnuncio('Movimiento ' + movimiento.paso + ' confirmado en Belo.');
      }}
    />
  );
}
