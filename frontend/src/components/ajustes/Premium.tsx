// Premium: solo mostrado, no construido. Sin pedir datos y sin inventar un precio.
const BENEFICIOS = [
  'Autonomía ganada: el agente hace solo lo rutinario',
  'Alertas del dólar según tu regla (no predice)',
  'Varias monedas y varios clientes',
  'Procesos de pyme: sueldos, proveedores, ARCA',
  'Reportes para tu contador',
  'Varios usuarios',
];

export default function Premium() {
  return (
    <section className="tarjeta">
      <h3 className="flex items-center gap-2 text-xl">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 11h12v9H6zM9 11V7a3 3 0 0 1 6 0v4" strokeLinejoin="round" />
        </svg>
        Premium
      </h3>
      <ul className="mt-3 space-y-2">
        {BENEFICIOS.map((b) => (
          <li key={b} className="flex gap-2 text-base text-tinta-suave">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violeta-claro" />
            {b}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-base">Precio: mensual, con tope · a definir.</p>
      <button type="button" className="boton-secundario mt-1 px-0" disabled aria-disabled="true">
        Próximamente
      </button>
    </section>
  );
}
