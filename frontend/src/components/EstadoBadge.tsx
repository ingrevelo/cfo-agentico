// Estado de un movimiento, con el vocabulario de la máquina de estados del backend.
// Cada estado lleva su TEXTO visible: nunca se distingue solo por el color.
import type { Estado } from '../api/tipos';

const estilos: Record<Estado, string> = {
  Propuesto: 'bg-black/5 text-ink',
  Aprobado: 'bg-violeta/10 text-violeta',
  Ejecutando: 'bg-mint/20 text-ink',
  Completado: 'bg-mint text-ink',
  Retenido: 'bg-amber-100 text-amber-900',
  Bloqueado: 'bg-red-100 text-red-900',
  Rechazado: 'bg-red-100 text-red-900',
  Desconocido: 'bg-black/5 text-ash-texto',
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
