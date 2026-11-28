// CfoApi contra el backend real (fetch a /api, mismo dominio).
//
// Es híbrido a propósito, mientras el dominio del backend no esté completo:
// - REAL: reglas, perfilado, MCP Log y reiniciar (backend/app/api/rutas_reales.py).
// - MOCK: el plan del ingreso, el juez, aprobar, el enlace de Belo y avanzar el reloj, que el
//   backend todavía responde con ejemplos fijos. El mock se sincroniza con las reglas reales,
//   así el plan respeta lo que la persona editó.
// - Si /api no responde (red o 5xx), cada método cae al mock: la demo nunca se queda en blanco.
// - El perfil "pyme" solo existe en el mock.
// Cuando existan el motor y el juez, cada método del plan pasa de `this.mock` a fetch.
import type { CfoApi } from '../CfoApi';
import type { MockCfoApi } from '../mock/MockCfoApi';
import type {
  ConfigDemo,
  EnlaceBelo,
  EntradaLog,
  PerfilId,
  Plan,
  PropuestaPerfilado,
  Reglas,
  ResultadoAprobacion,
  ResultadoEdicion,
  Sesion,
} from '../tipos';
import {
  type EntradaLogApi,
  type PropuestaApi,
  type ReglasApi,
  logDesdeApi,
  propuestaDesdeApi,
  reglasAApi,
  reglasDesdeApi,
} from './traduccion';

export class ErrorApi extends Error {
  constructor(
    public estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export class CfoApiHttp implements CfoApi {
  private perfil_id: PerfilId = 'sofia';

  constructor(
    private mock: MockCfoApi,
    private base = '',
  ) {}

  private get conBackend(): boolean {
    return this.perfil_id === 'sofia';
  }

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const r = await fetch(`${this.base}/api${ruta}`, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { 'content-type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (!r.ok) {
      const detalle = await r.json().catch(() => ({}));
      throw new ErrorApi(r.status, String(detalle?.detail ?? `Error ${r.status} en ${ruta}`));
    }
    return (await r.json()) as T;
  }

  /** Usa el backend; si no responde, el mock. Un 4xx sí se muestra: es un error de verdad. */
  private async conRespaldo<T>(real: () => Promise<T>, respaldo: () => Promise<T>): Promise<T> {
    if (!this.conBackend) return respaldo();
    try {
      return await real();
    } catch (e) {
      if (e instanceof ErrorApi && e.estado < 500) throw e;
      console.warn('La API no respondió; sigo con el mock.', e);
      return respaldo();
    }
  }

  private async sincronizar(reglas: Reglas): Promise<Reglas> {
    await this.mock.guardarReglas(reglas);
    return reglas;
  }

  // ---------------------------------------------------------------- sesión

  async iniciarSesionDemo(perfil_id: PerfilId): Promise<Sesion> {
    this.perfil_id = perfil_id;
    const sesion = await this.mock.iniciarSesionDemo(perfil_id);
    if (this.conBackend) await this.obtenerReglas(); // trae las reglas reales al mock
    return sesion;
  }

  // ---------------------------------------------------------------- reglas (real)

  obtenerReglas(): Promise<Reglas> {
    return this.conRespaldo(
      async () => this.sincronizar(reglasDesdeApi(await this.pedir<ReglasApi>('GET', '/reglas'))),
      () => this.mock.obtenerReglas(),
    );
  }

  guardarReglas(reglas: Reglas): Promise<Reglas> {
    return this.conRespaldo(
      async () =>
        this.sincronizar(reglasDesdeApi(await this.pedir<ReglasApi>('PUT', '/reglas', reglasAApi(reglas)))),
      () => this.mock.guardarReglas(reglas),
    );
  }

  // -------------------------------------------------------------- perfilado (real)

  correrPerfilado(): Promise<PropuestaPerfilado[]> {
    return this.conRespaldo(
      async () => (await this.pedir<PropuestaApi[]>('POST', '/perfilado')).map(propuestaDesdeApi),
      () => this.mock.correrPerfilado(),
    );
  }

  resolverPropuesta(id: string, accion: 'confirmar' | 'descartar'): Promise<Reglas> {
    return this.conRespaldo(
      async () => {
        await this.pedir('POST', `/perfilado/${encodeURIComponent(id)}/confirmar`, {
          confirmar: accion === 'confirmar',
        });
        return this.obtenerReglas();
      },
      () => this.mock.resolverPropuesta(id, accion),
    );
  }

  // ------------------------------------------------------------- plan (mock, por ahora)

  simularIngreso(): Promise<Plan | null> {
    return this.mock.simularIngreso();
  }

  obtenerPlan(plan_id: string): Promise<Plan> {
    return this.mock.obtenerPlan(plan_id);
  }

  editarMovimiento(plan_id: string, paso: string, monto_usd: number): Promise<ResultadoEdicion> {
    return this.mock.editarMovimiento(plan_id, paso, monto_usd);
  }

  aprobarPlan(plan_id: string): Promise<ResultadoAprobacion> {
    return this.mock.aprobarPlan(plan_id);
  }

  obtenerEnlaceBelo(plan_id: string, paso: string): Promise<EnlaceBelo> {
    return this.mock.obtenerEnlaceBelo(plan_id, paso);
  }

  confirmarEnlaceBelo(plan_id: string, paso: string, codigo: string): Promise<Plan> {
    return this.mock.confirmarEnlaceBelo(plan_id, paso, codigo);
  }

  avanzarDemo(destino: 'jueves'): Promise<Plan> {
    return this.mock.avanzarDemo(destino);
  }

  configurarDemo(c: ConfigDemo): Promise<void> {
    return this.mock.configurarDemo(c);
  }

  // ------------------------------------------------------------ log y reinicio (real)

  async obtenerLog(): Promise<EntradaLog[]> {
    const delPlan = await this.mock.obtenerLog();
    if (!this.conBackend) return delPlan;
    const delBackend = await this.conRespaldo(
      async () => (await this.pedir<EntradaLogApi[]>('GET', '/log')).map(logDesdeApi),
      async () => [],
    );
    return [...delBackend, ...delPlan];
  }

  async reiniciarDemo(): Promise<void> {
    await this.conRespaldo(
      () => this.pedir('POST', '/demo/reiniciar'),
      async () => undefined,
    );
    await this.mock.reiniciarDemo();
    if (this.conBackend) await this.obtenerReglas();
  }
}
