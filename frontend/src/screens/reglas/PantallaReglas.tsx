// Pantalla 1: las reglas duras y los vencimientos, editables y explicados.
// Las reglas viajan por la API: esta pantalla no calcula dinero ni lee ningún JSON.
import { useState } from 'react';
import { api } from '../../api';
import type { Reglas, ReglasDuras } from '../../api/tipos';
import { AvisoSintetico, Cargando, ErrorAviso, TituloPantalla } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import Figura3D from '../../components/Figura3D';
import { explicarVencimiento } from '../../formato';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';
import CampoNumero from './CampoNumero';
import { CAMPOS, validarRegla } from './campos';

export default function PantallaReglas() {
  const { estado, despachar } = useApp();
  const guardar = useAccion(api.guardarReglas.bind(api));
  const [borrador, setBorrador] = useState<Reglas | null>(estado.reglas);

  if (!estado.sesion) return <Cargando texto="Entrando a la demo..." />;
  const reglas = borrador ?? estado.reglas;
  if (!reglas) return <Cargando texto="Buscando tus reglas..." />;

  const { perfil } = estado.sesion;
  const errores = CAMPOS.map((c) => validarRegla(c, reglas.hard_rules[c.campo] as number)).filter(
    (e): e is { campo: keyof ReglasDuras; mensaje: string } => e !== null,
  );

  const cambiarRegla = (campo: keyof ReglasDuras, valor: number) =>
    setBorrador({ ...reglas, hard_rules: { ...reglas.hard_rules, [campo]: valor } });

  const cambiarVencimiento = (id: string, amount: number) =>
    setBorrador({
      ...reglas,
      dues: reglas.dues.map((d) => (d.id === id ? { ...d, amount } : d)),
    });

  async function confirmar() {
    if (!reglas) return;
    const guardadas = await guardar.ejecutar(reglas);
    if (!guardadas) return;
    despachar({ tipo: 'reglas', reglas: guardadas });
    despachar({ tipo: 'anunciar', texto: 'Reglas confirmadas.' });
    despachar({ tipo: 'ir', vista: 'plan' });
  }

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <header className="flex items-start justify-between gap-4">
        <TituloPantalla sub={`${perfil.occupation} en ${perfil.city}. Cobra en ${perfil.income_currency}.`}>
          Las reglas de {perfil.name}
        </TituloPantalla>
        <Figura3D tamano={96} />
      </header>

      <AvisoSintetico />
      {guardar.error && <ErrorAviso mensaje={guardar.error} onReintentar={confirmar} />}

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <CampoNumero
            key={c.campo}
            id={c.campo}
            etiqueta={c.etiqueta}
            explicacion={c.explicacion}
            sufijo={c.sufijo}
            valor={reglas.hard_rules[c.campo] as number}
            error={validarRegla(c, reglas.hard_rules[c.campo] as number)?.mensaje}
            onChange={(valor) => cambiarRegla(c.campo, valor)}
          />
        ))}
      </div>

      <h2 className="pt-2 text-xl">Lo que pagás todos los meses</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {reglas.dues.map((v) => (
          <CampoNumero
            key={v.id}
            id={'vencimiento-' + v.id}
            etiqueta={v.label}
            explicacion={explicarVencimiento(v.due, v.due_day)}
            sufijo={v.currency}
            valor={v.amount}
            etiquetaOrigen={v.origen === 'perfilado' ? 'Lo encontró el agente' : undefined}
            error={v.amount < 0 ? 'Tiene que ser un número entero de 0 o más.' : undefined}
            onChange={(amount) => cambiarVencimiento(v.id, amount)}
          />
        ))}
      </div>

      <BarraAccion
        etiqueta="Confirmar reglas"
        etiquetaCargando="Guardando..."
        onClick={confirmar}
        cargando={guardar.cargando}
        deshabilitado={errores.length > 0}
      />
    </div>
  );
}
