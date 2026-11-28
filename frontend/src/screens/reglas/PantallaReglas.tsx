import Figura3D from '../../components/Figura3D';
import SimulatedBadge from '../../components/SimulatedBadge';
import type { DatosSofia, ReglasDuras, Vencimiento } from '../../api/cliente';

interface Props {
  datos: DatosSofia;
  reglas: ReglasDuras;
  vencimientos: Vencimiento[];
  onCambiarRegla: (campo: keyof ReglasDuras, valor: number) => void;
  onCambiarVencimiento: (id: string, monto: number) => void;
  onConfirmar: () => void;
}

/** Un número editable con su etiqueta y su explicación en lenguaje simple. */
function CampoNumero(props: {
  id: string;
  etiqueta: string;
  explicacion: string;
  valor: number;
  sufijo: string;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="tarjeta">
      <label htmlFor={props.id} className="block text-sm font-semibold">
        {props.etiqueta}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={props.id}
          type="number"
          inputMode="decimal"
          className="campo"
          value={props.valor}
          onChange={(e) => props.onChange(Number(e.target.value))}
        />
        <span className="text-sm font-medium text-ash">{props.sufijo}</span>
      </div>
      <p className="mt-2 text-sm leading-snug text-ash">{props.explicacion}</p>
    </div>
  );
}

/** Las reglas duras, en el orden en que se cuentan. Cada una con su explicación. */
const CAMPOS: { campo: keyof ReglasDuras; etiqueta: string; sufijo: string; explicacion: string }[] = [
  {
    campo: 'min_cushion_usd',
    etiqueta: 'Colchón mínimo en dólares',
    sufijo: 'USD',
    explicacion: 'Nunca bajes de 500 dólares entre dólares, USDT y alcancías. Es tu red de seguridad.',
  },
  {
    campo: 'max_conversion_usd',
    etiqueta: 'Tope para cambiar a pesos sin preguntar',
    sufijo: 'USD',
    explicacion: 'Si una conversión pasa de este monto, el agente te pregunta antes de hacerla.',
  },
  {
    campo: 'fx_tolerance_pct',
    etiqueta: 'Cuánto puede empeorar el dólar',
    sufijo: '%',
    explicacion: 'Si el dólar se mueve en contra más que esto, la conversión se retiene y te vuelve a preguntar.',
  },
  {
    campo: 'fx_advance_trigger_pct',
    etiqueta: 'Cuánto tiene que mejorar para adelantar',
    sufijo: '%',
    explicacion: 'Si mejora al menos esto antes del vencimiento, el agente propone cambiar antes y gastar menos dólares.',
  },
  {
    campo: 'tax_pct_of_income',
    etiqueta: 'Cuánto apartar para impuestos',
    sufijo: '% del ingreso',
    explicacion: 'De cada ingreso se aparta este porcentaje en tu alcancía, antes de tocar el resto.',
  },
  {
    campo: 'min_liquid_usd',
    etiqueta: 'Dinero libre para el día a día',
    sufijo: 'USD',
    explicacion: 'Esto queda disponible sin tocar, para tus gastos de la semana.',
  },
  {
    campo: 'min_income_trigger_usd',
    etiqueta: 'Desde qué monto el agente arma un plan',
    sufijo: 'USD',
    explicacion: 'Los ingresos más chicos que esto no disparan ningún plan.',
  },
];

/** "thursday" se cuenta en castellano; el monotributo vence un día del mes. */
function explicarVencimiento(v: Vencimiento): string {
  if (v.due === 'thursday') return 'Vence cada semana, el jueves.';
  if (v.due) return `Vence cada semana, el ${v.due}.`;
  return `Vence el día ${v.due_day} de cada mes.`;
}

export default function PantallaReglas({
  datos,
  reglas,
  vencimientos,
  onCambiarRegla,
  onCambiarVencimiento,
  onConfirmar,
}: Props) {
  const { profile } = datos;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Las reglas de {profile.name}</h1>
          <p className="mt-2 text-sm text-ash">
            {profile.occupation} en {profile.city}. Cobra en {profile.income_currency}.
          </p>
        </div>
        <Figura3D tamano={112} />
      </header>

      <p className="flex items-center gap-2 text-sm text-ash">
        <SimulatedBadge /> Datos sintéticos de demostración: no son de ninguna persona real.
      </p>

      {CAMPOS.map((c) => (
        <CampoNumero
          key={c.campo}
          id={c.campo}
          etiqueta={c.etiqueta}
          explicacion={c.explicacion}
          sufijo={c.sufijo}
          valor={reglas[c.campo] as number}
          onChange={(valor) => onCambiarRegla(c.campo, valor)}
        />
      ))}

      <h2 className="pt-2 text-xl">Lo que pagás todos los meses</h2>
      {vencimientos.map((v) => (
        <CampoNumero
          key={v.id}
          id={`vencimiento-${v.id}`}
          etiqueta={v.label}
          explicacion={explicarVencimiento(v)}
          sufijo={v.currency}
          valor={v.amount}
          onChange={(monto) => onCambiarVencimiento(v.id, monto)}
        />
      ))}

      <button type="button" className="boton-primario mt-2 w-full" onClick={onConfirmar}>
        Confirmar reglas
      </button>
    </div>
  );
}
