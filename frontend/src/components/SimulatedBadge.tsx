// El sello de la demo. Va UNA sola vez, en la barra de arriba: cubre toda la app.
// Nada de esto corre en vivo (D10, D16).
export default function SimulatedBadge({ motivo }: { motivo?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-violeta-suave px-2 py-1 text-xs font-semibold uppercase tracking-wide text-violeta"
      title={motivo ?? 'No corre en vivo: es una simulación.'}
    >
      SIMULATED
    </span>
  );
}
