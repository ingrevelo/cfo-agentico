// Sello para todo lo que NO corre en vivo (regla 4 de CONTRIBUTING.md, D10).
// En esta demo va en todo: la URL pública no usa el MCP real (D16).
export default function SimulatedBadge({ motivo }: { motivo?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full bg-violeta/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violeta"
      title={motivo ?? 'No corre en vivo: es una simulación.'}
    >
      SIMULATED
    </span>
  );
}
