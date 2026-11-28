// Sello para todo lo que NO corre en vivo (regla 4 de CONTRIBUTING.md).
export default function SimulatedBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-violeta/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-violeta"
      title="Este movimiento corre contra el mock, no en vivo."
    >
      SIMULATED
    </span>
  );
}
