// Login de la demo: se elige un perfil y listo. SIN correo ni contraseña: no se guarda nada.
//
// La autenticación real va a ser auth.sign_in de Belo (OAuth con registro dinámico), y la
// aprobación de cada movimiento es un link de Belo con un código por correo. Eso no existe
// en la URL pública: el login es interactivo y con una cuenta real (D16).
import { api } from '../../api';
import type { PerfilId } from '../../api/tipos';
import { AvisoSintetico, ErrorAviso, TituloPantalla } from '../../components/avisos';
import { LISTA_PERFILES } from '../../data/perfiles';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';

export default function PantallaLogin() {
  const { despachar } = useApp();
  const entrar = useAccion(
    async (perfil_id: PerfilId) => {
      const sesion = await api.iniciarSesionDemo(perfil_id);
      const reglas = await api.obtenerReglas();
      return { sesion, reglas };
    },
  );

  async function elegir(perfil_id: PerfilId) {
    const r = await entrar.ejecutar(perfil_id);
    if (!r) return;
    despachar({ tipo: 'sesion', sesion: r.sesion });
    despachar({ tipo: 'reglas', reglas: r.reglas });
    despachar({ tipo: 'anunciar', texto: 'Entraste como ' + r.sesion.perfil.name + '.' });
    despachar({ tipo: 'ir', vista: 'perfilado' });
  }

  return (
    <div className="space-y-4">
      <TituloPantalla sub="Elegí con qué perfil querés probar la demo. Son dos personas inventadas, con el mismo agente y las mismas reglas.">
        ¿Con quién entramos?
      </TituloPantalla>

      <AvisoSintetico />

      {entrar.error && <ErrorAviso mensaje={entrar.error} onReintentar={entrar.limpiarError} />}

      {LISTA_PERFILES.map((perfil) => (
        <section key={perfil.id} className="tarjeta">
          <h2 className="text-xl">{perfil.id === 'sofia' ? 'Sofía' : 'Nodo Consultora'}</h2>
          <p className="mt-2 text-sm leading-snug text-ash-texto">{perfil.descripcion}</p>
          <button
            type="button"
            className="boton-primario mt-4 w-full"
            onClick={() => elegir(perfil.id)}
            disabled={entrar.cargando}
            aria-busy={entrar.cargando}
          >
            {entrar.cargando ? 'Entrando...' : perfil.etiqueta_login}
          </button>
        </section>
      ))}

      <p className="text-xs leading-relaxed text-ash-texto">
        No pedimos correo ni contraseña porque no hay nada que guardar. En la versión real, entrar es
        iniciar sesión en Belo con tu propia cuenta.
      </p>
    </div>
  );
}
