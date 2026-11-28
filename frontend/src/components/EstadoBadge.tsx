// Estado de un movimiento, con el vocabulario de la máquina de estados del backend.
// Cada estado lleva su TEXTO visible: nunca se distingue solo por el color.
import type { Estado } from '../api/tipos';

const estilos: Record<Estado, string> = {
  Propuesto: 'bg-violeta-suave text-tinta',
  Aprobado: 'bg-violeta-suave text-violeta',
  Ejecutando: 'bg-exito-suave text-exito-texto',
  Completado: 'bg-exito-suave text-exito-texto',
  Retenido: 'bg-aviso-suave text-aviso-texto',
  Desconocido: 'bg-aviso-suave text-aviso-texto',
  Bloqueado: 'bg-peligro-suave text-peligro',
  Rechazado: 'bg-peligro-suave text-peligro',
};

export default function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${estilos[estado]}`}
    >
      {estado}
    </span>
  );
}
