import Figura3D from '../../components/Figura3D';
import SimulatedBadge from '../../components/SimulatedBadge';
import TarjetaPlan, { type MovimientoPlan } from '../../components/TarjetaPlan';
import type { DatosSofia, ReglasDuras, Vencimiento } from '../../api/cliente';

interface Props {
  datos: DatosSofia;
  reglas: ReglasDuras;
  vencimientos: Vencimiento[];
  onAprobar: () => void;
}

const usd = (n: number) => `USD ${n.toLocaleString('es-AR')}`;
const ars = (n: number) => `${n.toLocaleString('es-AR')} ARS`;

export default function PantallaPlan({ datos, reglas, vencimientos, onAprobar }: Props) {
  const ingreso = datos.balances.USD;
  const fx = datos.fx_demo.USD_ARS;
  const alquiler = vencimientos.find((v) => v.id === 'rent-thursday');
  const alquilerArs = alquiler?.amount ?? 0;

  // Cuentas de la vista, solo para mostrar el plan de la demo.
  // El plan de verdad lo calcula el motor de reglas del backend (domain/) y llega por /api.
  const impuestos = Math.round((ingreso * reglas.tax_pct_of_income) / 100);
  const libre = reglas.min_liquid_usd;
  const aConvertir = Math.ceil(alquilerArs / fx);
  const pesosObtenidos = aConvertir * fx;
  const rindiendo = ingreso - impuestos - libre - aConvertir;
  const quedanEnDolares = ingreso - aConvertir;
  const colchonCubierto = quedanEnDolares >= reglas.min_cushion_usd;

  const movimientos: MovimientoPlan[] = [
    {
      id: 'usdt',
      titulo: `Dejar rindiendo en ${datos.soft_preferences.yield_asset}`,
      monto: usd(rindiendo),
      porque: 'Es el excedente del mes. El rendimiento es variable: no hay una tasa fija garantizada.',
      estado: 'Propuesto',
    },
    {
      id: 'impuestos',
      titulo: `Apartar en la alcancía "${datos.soft_preferences.tax_pocket_name}"`,
      monto: usd(impuestos),
      detalle: `${reglas.tax_pct_of_income}% del ingreso`,
      porque: 'Queda guardado para el monotributo. Las alcancías todavía no se pueden mover en vivo.',
      estado: 'Propuesto',
      simulado: true,
    },
    {
      id: 'conversion',
      titulo: 'Cambiar a pesos el jueves',
      monto: usd(aConvertir),
      detalle: `${ars(pesosObtenidos)} a ${fx.toLocaleString('es-AR')}`,
      porque: `Solo lo que necesitás para el ${alquiler?.label.toLowerCase() ?? 'vencimiento'} de ${ars(alquilerArs)}, el día que vence.`,
      estado: 'Propuesto',
    },
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ash">Entra un pago de</p>
          <h1 className="mt-1 text-4xl">{usd(ingreso)}</h1>
          <p className="mt-2 text-sm text-ash">Así lo reparte el agente. Nada se mueve hasta que vos digas que sí.</p>
        </div>
        <Figura3D tamano={112} />
      </header>

      <TarjetaPlan titulo="El plan de este ingreso" movimientos={movimientos} />

      <section className="tarjeta space-y-3" aria-label="Resumen del plan">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm font-semibold">Libre para el día a día</span>
          <span className="text-xl font-bold tracking-[-0.04em]">{usd(libre)}</span>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-black/5 pt-3">
          <span className="text-sm font-semibold">Te quedan en dólares</span>
          <span className="text-xl font-bold tracking-[-0.04em]">{usd(quedanEnDolares)}</span>
        </div>
        <p className="text-sm leading-snug text-ash">
          {colchonCubierto
            ? `Tu colchón de ${usd(reglas.min_cushion_usd)} queda cubierto.`
            : `Atención: bajarías de tu colchón de ${usd(reglas.min_cushion_usd)}.`}
        </p>
      </section>

      <p className="flex items-center gap-2 text-sm text-ash">
        <SimulatedBadge /> Datos sintéticos. Este plan es una propuesta: todavía no se movió ningún dinero.
      </p>

      <div className="pt-2">
        <button type="button" className="boton-primario w-full" onClick={onAprobar}>
          Aprobar plan
        </button>
      </div>
    </div>
  );
}
