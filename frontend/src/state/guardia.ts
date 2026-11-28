// Un cerrojo chiquito y sincrónico.
//
// El estado de React no sirve para esto: si alguien toca dos botones en el mismo
// instante, el componente todavía no se volvió a dibujar y los dos clics ven el
// estado viejo. Este cerrojo se cierra en el acto, antes de cualquier await.
export interface Guardia {
  /** Devuelve true solo la primera vez, hasta que se libere. */
  tomar: () => boolean;
  liberar: () => void;
  ocupado: () => boolean;
}

export function crearGuardia(): Guardia {
  let ocupado = false;
  return {
    tomar: () => {
      if (ocupado) return false;
      ocupado = true;
      return true;
    },
    liberar: () => {
      ocupado = false;
    },
    ocupado: () => ocupado,
  };
}
