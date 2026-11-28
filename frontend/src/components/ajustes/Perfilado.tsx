// Perfilado en modo sombra. Propone y no cambia nada hasta que se confirma (T12).
// El perfilador de verdad vive en backend/app/domain/perfilador.py.
import { useEffect, useRef } from 'react';
import { api } from '../../api';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';
import { Cargando, ErrorAviso } from '../avisos';

export default function Perfilado() {
  const { estado, despachar } = useApp();
  const correr = useAccion(api.correrPerfilado.bind(api));
  const resolver = useAccion(api.resolverPropuesta.bind(api));
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;
    correr.ejecutar().then((p) => p && despachar({ tipo: 'propuestas', propuestas: p }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }

  return (
    <section>
      <h3 className="text-xl">Lo que encontró el agente</h3>
      {correr.cargando && <Cargando texto="Mirando tu historial..." />}
      {correr.error && <ErrorAviso mensaje={correr.error} onReintentar={() => correr.ejecutar()} />}

      <ul className="mt-3 space-y-3">
        {estado.propuestas.map((p) => (
          <li key={p.id} className="tarjeta">
            <p className="text-base">{p.texto}</p>
            {p.estado === 'pendiente' && p.tipo === 'vencimiento' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="boton-secundario bg-violeta-suave"
                  onClick={() => decidir(p.id, 'confirmar')}
                  disabled={resolver.cargando}
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  className="boton-secundario text-tinta-suave"
                  onClick={() => decidir(p.id, 'descartar')}
                  disabled={resolver.cargando}
                >
                  Descartar
                </button>
              </div>
            )}
            {p.estado === 'confirmada' && (
              <p className="mt-2 text-base font-semibold text-exito-texto">Ya está en tus reglas.</p>
            )}
            {p.estado === 'descartada' && (
              <p className="mt-2 text-base text-tinta-suave">No lo voy a tener en cuenta.</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
