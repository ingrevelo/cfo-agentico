// Perfilado en modo sombra: el agente mira el historial y propone. No escribe nada.
// Hasta que la persona confirma, las reglas no cambian (T12).
import { useEffect, useRef } from 'react';
import { api } from '../../api';
import { AvisoSintetico, Cargando, ErrorAviso, TituloPantalla, Vacio } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import { PERFILADO } from '../../data/perfilado';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';

export default function PantallaPerfilado() {
  const { estado, despachar } = useApp();
  const correr = useAccion(api.correrPerfilado.bind(api));
  const resolver = useAccion(api.resolverPropuesta.bind(api));

  // En desarrollo React monta dos veces para detectar errores. Sin esta marca, el
  // perfilado se correría dos veces y dejaría dos filas iguales en el MCP Log.
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;
    correr.ejecutar().then((propuestas) => {
      if (propuestas) despachar({ tipo: 'propuestas', propuestas });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perfil_id = estado.sesion?.perfil_id ?? 'sofia';
  /** Solo las de tipo vencimiento se confirman: las informativas no cambian reglas. */
  const pendientes = estado.propuestas.filter(
    (p) => p.estado === 'pendiente' && p.tipo === 'vencimiento',
  );

  async function decidir(id: string, accion: 'confirmar' | 'descartar') {
    const reglas = await resolver.ejecutar(id, accion);
    if (!reglas) return;
    despachar({ tipo: 'reglas', reglas });
    despachar({
      tipo: 'propuestas',
      propuestas: estado.propuestas.map((p) =>
        p.id === id ? { ...p, estado: accion === 'confirmar' ? 'confirmada' : 'descartada' } : p,
      ),
    });
    despachar({
      tipo: 'anunciar',
      texto:
        accion === 'confirmar'
          ? 'Propuesta confirmada: ya está en tus reglas.'
          : 'Propuesta descartada: no la voy a tener en cuenta.',
    });
  }

  async function confirmarTodo() {
    // Se despacha una sola vez al final: así no se pisan las actualizaciones.
    let ultimas = estado.propuestas;
    for (const p of pendientes) {
      const reglas = await resolver.ejecutar(p.id, 'confirmar');
      if (!reglas) return;
      despachar({ tipo: 'reglas', reglas });
      ultimas = ultimas.map((x) => (x.id === p.id ? { ...x, estado: 'confirmada' as const } : x));
    }
    despachar({ tipo: 'propuestas', propuestas: ultimas });
    despachar({ tipo: 'anunciar', texto: 'Confirmé las propuestas: ya están en tus reglas.' });
  }

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <TituloPantalla sub="Miré tus movimientos de los últimos meses y encontré cosas que se repiten. No cambié nada: esto es solo lo que te propongo.">
        Lo que encontré en tu cuenta
      </TituloPantalla>

      <AvisoSintetico />

      {correr.cargando && <Cargando texto="Mirando tu historial..." />}
      {correr.error && <ErrorAviso mensaje={correr.error} onReintentar={() => correr.ejecutar()} />}
      {resolver.error && <ErrorAviso mensaje={resolver.error} />}

      {!correr.cargando && estado.propuestas.length === 0 && (
        <Vacio titulo="Todavía no encontré patrones">
          Hacen falta al menos tres repeticiones para proponerte una regla.
        </Vacio>
      )}

      {pendientes.length > 1 && (
        <button
          type="button"
          className="h-10 rounded-full bg-black/5 px-5 text-sm font-semibold hover:bg-black/10 disabled:opacity-40"
          onClick={confirmarTodo}
          disabled={resolver.cargando}
          aria-busy={resolver.cargando}
        >
          {resolver.cargando ? 'Confirmando...' : 'Confirmar todo'}
        </button>
      )}

      {estado.propuestas.map((p) => (
        <section key={p.id} className="tarjeta">
          <p className="text-sm leading-snug">{p.texto}</p>
          {p.estado === 'pendiente' && p.tipo === 'vencimiento' && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-full bg-black/5 px-5 text-sm font-semibold hover:bg-black/10 disabled:opacity-40"
                onClick={() => decidir(p.id, 'confirmar')}
                disabled={resolver.cargando}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="boton-texto"
                onClick={() => decidir(p.id, 'descartar')}
                disabled={resolver.cargando}
              >
                Descartar
              </button>
            </div>
          )}
          {p.estado === 'confirmada' && (
            <p className="mt-3 text-sm font-medium text-violeta">Confirmado: ya está en tus reglas.</p>
          )}
          {p.estado === 'descartada' && (
            <p className="mt-3 text-sm font-medium text-ash-texto">
              Descartado: no lo voy a tener en cuenta.
            </p>
          )}
        </section>
      ))}

      <section className="tarjeta bg-black/[0.02]">
        <h2 className="text-xl">Qué habría pasado</h2>
        <p className="mt-2 text-sm leading-relaxed text-ash-texto">
          {PERFILADO[perfil_id].contrafactico}
        </p>
      </section>

      <BarraAccion
        etiqueta="Seguir a mis reglas"
        onClick={() => despachar({ tipo: 'ir', vista: 'reglas' })}
        secundaria={
          <button
            type="button"
            className="boton-texto w-full md:w-auto"
            onClick={() => despachar({ tipo: 'ir', vista: 'reglas' })}
          >
            Saltar por ahora
          </button>
        }
      />
    </div>
  );
}
