// Estado de un movimiento, con el mismo vocabulario que la máquina de estados del backend.
export type Estado =
  | 'Propuesto'
  | 'Aprobado'
  | 'Ejecutando'
  | 'Completado'
  | 'Retenido'
  | 'Desconocido';

const estilos: Record<Estado, string> = {
  Propuesto: 'bg-black/5 text-ink',
  Aprobado: 'bg-violeta/10 text-violeta',
  Ejecutando: 'bg-mint/20 text-ink',
  Completado: 'bg-mint text-ink',
  Retenido: 'bg-amber-100 text-amber-900',
  Desconocido: 'bg-black/5 text-ash',
};

export default function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${estilos[estado]}`}>
      {estado}
    </span>
  );
}
