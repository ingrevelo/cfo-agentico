// El estado compartido, con useReducer y Context. Sin persistencia entre recargas:
// cada pestaña tiene su propio mock, así dos jurados no se pisan entre ellos.
import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import { ESTADO_INICIAL, reducer, type Accion, type EstadoApp } from './reducer';

interface Valor {
  estado: EstadoApp;
  despachar: (accion: Accion) => void;
}

const Contexto = createContext<Valor | null>(null);

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [estado, despachar] = useReducer(reducer, ESTADO_INICIAL);
  const valor = useMemo(() => ({ estado, despachar }), [estado]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp se usa dentro de ProveedorApp.');
  return valor;
}
